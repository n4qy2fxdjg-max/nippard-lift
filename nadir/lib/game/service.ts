/**
 * Server-side game service: the only place that reads/writes authoritative game state.
 *
 *  - every action goes through `applyAction` (serialised per game, optimistic version check)
 *  - every undoable action stores the pre-action snapshot in GameEvent.stateBeforeJson
 *  - completion writes history (GameAnswer), bumps question usage and updates the jackpot bank
 */
import { prisma, json } from '@/lib/db/prisma';
import { loadFinalCategories, loadQuestions } from '@/lib/db/questions';
import { createInitialState, isUndoable, reduce } from '@/lib/game-engine/engine';
import { DEFAULT_CONFIG, TEAM_ACTIONS, type EngineContext, type GameAction, type GameConfig, type GameState, type RoundPlan } from '@/lib/game-engine/types';
import { publishGameChanged } from '@/lib/realtime/bus';
import { HttpError } from '@/lib/util/http';
import { TEAM_COLORS, generateId, generateRoomCode, generateToken } from '@/lib/util/ids';
import { fillRoundPlans, type SelectionMode } from './selection';

// ---------------------------------------------------------------------------
// Per-game serialisation
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __nadirLocks: Map<string, Promise<unknown>> | undefined;
}
const locks: Map<string, Promise<unknown>> = globalThis.__nadirLocks ?? new Map();
globalThis.__nadirLocks = locks;

async function withGameLock<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(gameId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const chained = prev.then(() => gate);
  locks.set(gameId, chained);
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (locks.get(gameId) === chained) locks.delete(gameId);
  }
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const ctxCache = new Map<string, { key: string; ctx: Omit<EngineContext, 'now'> }>();

function ctxKey(config: GameConfig) {
  return config.rounds.map((r) => [...r.questionIds, ...r.tiebreakQuestionIds, ...r.finalCategoryIds].join(',')).join('|');
}

export async function buildContext(state: GameState, extraQuestionIds: string[] = []): Promise<EngineContext> {
  const key = ctxKey(state.config) + '#' + extraQuestionIds.join(',') + '#' + state.tiebreakQuestionsUsed.join(',');
  const cached = ctxCache.get(state.id);
  if (cached && cached.key === key) return { ...cached.ctx, now: Date.now() };
  const questionIds = new Set<string>([...state.config.rounds.flatMap((r) => [...r.questionIds, ...r.tiebreakQuestionIds]), ...state.tiebreakQuestionsUsed, ...extraQuestionIds]);
  if (state.question) questionIds.add(state.question.questionId);
  const [questions, finalCategories] = await Promise.all([loadQuestions([...questionIds]), loadFinalCategories(state.config.rounds.flatMap((r) => r.finalCategoryIds))]);
  const ctx = { questions, finalCategories };
  ctxCache.set(state.id, { key, ctx });
  return { ...ctx, now: Date.now() };
}

export interface LoadedGame {
  state: GameState;
  ctx: EngineContext;
  hostToken: string;
  status: string;
  version: number;
}

export async function loadGame(gameId: string): Promise<LoadedGame> {
  const row = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true, stateJson: true, hostToken: true, status: true, version: true } });
  if (!row) throw new HttpError(404, 'Game not found', 'GAME_NOT_FOUND');
  const state = json.parse<GameState | null>(row.stateJson, null);
  if (!state) throw new HttpError(500, 'Game state is corrupt', 'CORRUPT_STATE');
  const ctx = await buildContext(state);
  return { state, ctx, hostToken: row.hostToken, status: row.status, version: row.version };
}

export async function findGameByRoomCode(code: string) {
  return prisma.game.findUnique({ where: { roomCode: code.toUpperCase().trim() }, include: { teams: { orderBy: { sortOrder: 'asc' }, include: { players: { orderBy: { sortOrder: 'asc' } } } } } });
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export interface CreateGameInput {
  name: string;
  config: Partial<Omit<GameConfig, 'rounds'>> & { rounds: RoundPlan[] };
  teams: { name: string; players: string[]; color?: string }[];
  selectionMode: SelectionMode;
  /** Overrides the carried-over jackpot (defaults to the bank for the currency, or startingJackpot). */
  jackpotOverride?: number | null;
}

export async function currentBankJackpot(currency: string, startingJackpot: number): Promise<number> {
  const bank = await prisma.jackpot.findUnique({ where: { currency } });
  return bank?.amount ?? startingJackpot;
}

export async function createGame(input: CreateGameInput) {
  if (input.teams.length < 2 || input.teams.length > 8) throw new HttpError(400, 'Between 2 and 8 teams are required');
  const config: GameConfig = { ...DEFAULT_CONFIG, ...input.config, rounds: input.config.rounds };
  const pool = await prisma.question.findMany({ where: { status: { in: ['READY', 'USED'] } }, select: { id: true, category: true, format: true, difficulty: true, usedCount: true, status: true } });
  const rounds = fillRoundPlans(config.rounds, pool.map((q) => ({ ...q, format: q.format as never })), input.selectionMode === 'MANUAL' ? 'SMART_RANDOM' : input.selectionMode);
  // MANUAL still fills gaps smartly so the game is always playable.
  for (const [i, r] of rounds.entries()) {
    if (r.type === 'ELIMINATION' && r.questionIds.length < r.passes) throw new HttpError(400, `Round ${i + 1} needs ${r.passes} question(s) but only ${r.questionIds.length} are available. Add more READY questions.`);
    if (r.type === 'HEAD_TO_HEAD' && r.questionIds.length < r.bestOf) throw new HttpError(400, 'Not enough questions for the Head-to-Head');
  }
  const finalRound = rounds.find((r) => r.type === 'FINAL');
  if (finalRound && finalRound.finalCategoryIds.length === 0) {
    const cats = await prisma.finalCategory.findMany({ where: { status: { in: ['READY', 'USED'] } }, select: { id: true }, take: 5, orderBy: { updatedAt: 'asc' } });
    finalRound.finalCategoryIds = cats.map((c) => c.id);
    if (!finalRound.finalCategoryIds.length) throw new HttpError(400, 'No final categories available. Create at least one in Admin → Final categories.');
  }
  config.rounds = rounds;

  const jackpotAmount = input.jackpotOverride ?? (await currentBankJackpot(config.currency, config.startingJackpot));
  const id = generateId();
  let roomCode = generateRoomCode();
  for (let i = 0; i < 5; i++) {
    if (!(await prisma.game.findUnique({ where: { roomCode } }))) break;
    roomCode = generateRoomCode();
  }
  const teams = input.teams.map((t, i) => ({ id: generateId(), name: t.name.trim() || `Team ${i + 1}`, color: t.color ?? TEAM_COLORS[i % TEAM_COLORS.length], token: generateToken(), players: t.players.map((p) => p.trim()).filter(Boolean).map((name) => ({ id: generateId(), name })) }));
  const now = Date.now();
  const state = createInitialState({ id, name: input.name.trim() || 'Untitled game', roomCode, config, teams, jackpotAmount, now });
  const hostToken = generateToken();

  await prisma.game.create({
    data: {
      id,
      name: state.name,
      roomCode,
      hostToken,
      status: 'LOBBY',
      currency: config.currency,
      configJson: json.stringify(config),
      stateJson: json.stringify(state),
      version: 0,
      teams: { create: teams.map((t, i) => ({ id: t.id, name: t.name, color: t.color, token: t.token, sortOrder: i, players: { create: t.players.map((p, j) => ({ id: p.id, name: p.name, sortOrder: j })) } })) },
      rounds: { create: rounds.map((r, i) => ({ index: i, type: r.type, passes: r.passes, eliminateCount: r.eliminateCount, bestOf: r.bestOf, configJson: json.stringify({ finalCategoryIds: r.finalCategoryIds }), questions: { create: [...r.questionIds.map((qid, j) => ({ questionId: qid, passIndex: j, role: 'MAIN', sortOrder: j })), ...r.tiebreakQuestionIds.map((qid, j) => ({ questionId: qid, passIndex: 0, role: 'TIEBREAK', sortOrder: j }))] } })) },
      events: { create: { seq: 0, type: 'GAME_CREATED', actor: 'HOST', payloadJson: json.stringify({ teams: teams.length }), undoable: false } },
    },
  });
  return { id, roomCode, hostToken, state };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ApplyResult {
  state: GameState;
  ctx: EngineContext;
}

export async function applyAction(gameId: string, action: GameAction, actor: 'HOST' | 'TEAM' | 'SYSTEM', opts: { extraQuestionIds?: string[] } = {}): Promise<ApplyResult> {
  return withGameLock(gameId, async () => {
    const row = await prisma.game.findUnique({ where: { id: gameId }, select: { stateJson: true, version: true, status: true } });
    if (!row) throw new HttpError(404, 'Game not found', 'GAME_NOT_FOUND');
    const before = json.parse<GameState | null>(row.stateJson, null);
    if (!before) throw new HttpError(500, 'Game state is corrupt');
    if (actor === 'TEAM' && !TEAM_ACTIONS.includes(action.type)) throw new HttpError(403, 'Teams cannot perform that action', 'FORBIDDEN');
    const ctx = await buildContext(before, opts.extraQuestionIds ?? []);
    const after = reduce(before, action, ctx);
    if (after === before) return { state: before, ctx };

    const undoable = isUndoable(action) && actor !== 'SYSTEM';
    const status = after.phase === 'GAME_OVER' ? 'COMPLETED' : after.phase === 'LOBBY' ? 'LOBBY' : 'LIVE';
    const lastSeq = await prisma.gameEvent.aggregate({ where: { gameId }, _max: { seq: true } });
    const seq = (lastSeq._max.seq ?? 0) + 1;

    const updated = await prisma.game.updateMany({
      where: { id: gameId, version: row.version },
      data: { stateJson: json.stringify(after), version: row.version + 1, status, zeroCount: after.jackpot.zeroCount, winnerTeamId: after.winnerTeamId, ...(after.phase === 'GAME_OVER' ? { completedAt: new Date(), finalJackpot: after.final?.jackpotAtStake ?? after.jackpot.amount, jackpotWon: after.jackpot.won ?? false } : {}) },
    });
    if (updated.count === 0) throw new HttpError(409, 'Game was modified concurrently; retry', 'CONFLICT');

    await prisma.gameEvent.create({
      data: { gameId, seq, type: action.type, actor, payloadJson: json.stringify(redactAction(action)), stateBeforeJson: undoable ? json.stringify(before) : null, undoable },
    });

    if (after.phase === 'GAME_OVER' && before.phase !== 'GAME_OVER') await finalizeGame(after);
    if (before.phase === 'GAME_OVER' && after.phase !== 'GAME_OVER') await unfinalizeGame(after);

    const versioned = { ...after, version: row.version + 1 };
    publishGameChanged({ gameId, version: row.version + 1, phase: after.phase });
    return { state: versioned, ctx };
  });
}

function redactAction(action: GameAction): unknown {
  return action;
}

export async function undoLastAction(gameId: string): Promise<ApplyResult> {
  return withGameLock(gameId, async () => {
    const row = await prisma.game.findUnique({ where: { id: gameId }, select: { stateJson: true, version: true } });
    if (!row) throw new HttpError(404, 'Game not found', 'GAME_NOT_FOUND');
    const current = json.parse<GameState | null>(row.stateJson, null)!;
    const event = await prisma.gameEvent.findFirst({ where: { gameId, undoable: true, stateBeforeJson: { not: null } }, orderBy: { seq: 'desc' } });
    if (!event?.stateBeforeJson) throw new HttpError(409, 'Nothing to undo', 'NOTHING_TO_UNDO');
    const restored = json.parse<GameState | null>(event.stateBeforeJson, null);
    if (!restored) throw new HttpError(500, 'Snapshot is corrupt');
    // Keep live presence flags; they are not part of game logic.
    const state: GameState = { ...restored, teams: restored.teams.map((t) => ({ ...t, connected: current.teams.find((c) => c.id === t.id)?.connected ?? t.connected })), version: current.version };
    const status = state.phase === 'GAME_OVER' ? 'COMPLETED' : state.phase === 'LOBBY' ? 'LOBBY' : 'LIVE';
    const lastSeq = await prisma.gameEvent.aggregate({ where: { gameId }, _max: { seq: true } });
    await prisma.$transaction([
      prisma.gameEvent.deleteMany({ where: { gameId, seq: { gte: event.seq } } }),
      prisma.gameEvent.create({ data: { gameId, seq: (lastSeq._max.seq ?? 0) + 1, type: 'UNDO', actor: 'HOST', payloadJson: json.stringify({ undoneSeq: event.seq, undoneType: event.type, payload: json.parse(event.payloadJson, {}) }), undoable: false } }),
      prisma.game.update({ where: { id: gameId }, data: { stateJson: json.stringify(state), version: row.version + 1, status, zeroCount: state.jackpot.zeroCount, winnerTeamId: state.winnerTeamId } }),
    ]);
    if (current.phase === 'GAME_OVER' && state.phase !== 'GAME_OVER') await unfinalizeGame(state);
    const ctx = await buildContext(state);
    const versioned = { ...state, version: row.version + 1 };
    publishGameChanged({ gameId, version: row.version + 1, phase: state.phase });
    return { state: versioned, ctx };
  });
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

async function finalizeGame(state: GameState) {
  const nextAmount = state.jackpot.nextGameAmount ?? state.jackpot.amount;
  await prisma.$transaction(async (tx) => {
    await tx.gameAnswer.deleteMany({ where: { gameId: state.id } });
    if (state.answerLog.length) {
      await tx.gameAnswer.createMany({
        data: state.answerLog.map((a) => ({ gameId: state.id, teamId: a.teamId, questionId: a.questionId, matchedAnswerId: a.matchedAnswerId, stage: a.stage, roundIndex: a.roundIndex, passIndex: a.passIndex, playerName: a.playerName, submitted: a.text, score: a.score, correct: a.correct, isZero: a.isZero, overridden: a.overridden, createdAt: new Date(a.at) })),
      });
    }
    const questionIds = [...new Set(state.answerLog.map((a) => a.questionId))];
    if (questionIds.length) await tx.question.updateMany({ where: { id: { in: questionIds } }, data: { usedCount: { increment: 1 }, status: 'USED' } });
    if (state.final?.chosenCategoryId) await tx.finalCategory.update({ where: { id: state.final.chosenCategoryId }, data: { status: 'USED' } }).catch(() => undefined);
    for (const t of state.teams) {
      await tx.team.update({ where: { id: t.id }, data: { eliminatedRound: t.eliminatedRound, finalPlacement: t.id === state.winnerTeamId ? 1 : null } });
    }
    await tx.jackpot.upsert({ where: { currency: state.config.currency }, create: { currency: state.config.currency, amount: nextAmount, lastGameId: state.id }, update: { amount: nextAmount, lastGameId: state.id } });
  });
}

async function unfinalizeGame(state: GameState) {
  const opening = state.jackpot.history[0]?.amount ?? state.config.startingJackpot;
  await prisma.$transaction(async (tx) => {
    await tx.gameAnswer.deleteMany({ where: { gameId: state.id } });
    await tx.game.update({ where: { id: state.id }, data: { completedAt: null, finalJackpot: null, jackpotWon: null } });
    const bank = await tx.jackpot.findUnique({ where: { currency: state.config.currency } });
    if (bank?.lastGameId === state.id) await tx.jackpot.update({ where: { currency: state.config.currency }, data: { amount: opening, lastGameId: null } });
  });
}

// ---------------------------------------------------------------------------
// Tie-break helpers
// ---------------------------------------------------------------------------

export async function tiebreakOptions(state: GameState) {
  const round = state.config.rounds[state.roundIndex];
  const usedInGame = new Set([...state.config.rounds.flatMap((r) => r.questionIds), ...state.tiebreakQuestionsUsed]);
  const planned = (round?.tiebreakQuestionIds ?? []).filter((id) => !usedInGame.has(id));
  const extra = await prisma.question.findMany({ where: { status: { in: ['READY', 'USED'] }, format: 'OPEN', id: { notIn: [...usedInGame, ...planned] } }, select: { id: true, category: true, text: true, difficulty: true }, orderBy: [{ usedCount: 'asc' }, { createdAt: 'desc' }], take: 12 });
  const plannedRows = planned.length ? await prisma.question.findMany({ where: { id: { in: planned } }, select: { id: true, category: true, text: true, difficulty: true } }) : [];
  return { planned: plannedRows, extra };
}
