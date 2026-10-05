/**
 * The NADIR game engine: a deterministic reducer `reduce(state, action, ctx) => state`.
 *
 * Rules of the file:
 *  - never mutate the incoming state (we return structurally new objects)
 *  - never read the clock or random numbers (ctx.now and action payloads carry them)
 *  - throw EngineError for actions that are not legal in the current phase
 *
 * Undo is implemented outside the reducer (snapshots per applied action).
 */
import {
  EngineError,
  NON_UNDOABLE_ACTIONS,
  submissionKey,
  type EngineContext,
  type FinalAnswerResult,
  type GameAction,
  type GameConfig,
  type GameState,
  type Phase,
  type QuestionDef,
  type QuestionRun,
  type Stage,
  type Submission,
  type TeamState,
} from './types';
import {
  activeTeams,
  allTurnsRevealed,
  buildTurns,
  currentRound,
  currentSubmission,
  currentTurn,
  defaultTurnOrder,
  emptySubmission,
  formatMoney,
  poolAnswers,
  requiresBoardSelection,
  requiresTypedAnswer,
  teamById,
  teamSubmissions,
  usesBoard,
} from './helpers';
import {
  calculateFinalResult,
  calculateGameTotals,
  calculateRoundTotals,
  combineLinkedScores,
  getEliminatedTeams,
  headToHeadWinner,
  resolveHeadToHeadQuestion,
  resolveTie,
  scoreAnswer,
  scoreBoardSelection,
  scoreFromAnswerDef,
  type ScoredAnswer,
} from '@/lib/scoring';

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export interface NewGameInput {
  id: string;
  name: string;
  roomCode: string;
  config: GameConfig;
  teams: { id: string; name: string; color: string; players: { id: string; name: string }[] }[];
  jackpotAmount: number;
  now: number;
}

export function createInitialState(input: NewGameInput): GameState {
  return {
    id: input.id,
    name: input.name,
    roomCode: input.roomCode,
    config: input.config,
    phase: 'LOBBY',
    previousPhase: null,
    teams: input.teams.map((t) => ({ ...t, eliminatedRound: null, connected: false })),
    roundIndex: 0,
    passIndex: 0,
    roundScores: {},
    question: null,
    pendingElimination: null,
    eliminations: [],
    tiebreakQuestionsUsed: [],
    h2h: null,
    final: null,
    timer: { kind: 'NONE', durationMs: 0, endsAt: null, remainingMs: 0, running: false },
    jackpot: {
      amount: input.jackpotAmount,
      startingAmount: input.config.startingJackpot,
      currency: input.config.currency,
      zeroCount: 0,
      history: [{ at: input.now, delta: 0, reason: 'Opening jackpot', amount: input.jackpotAmount }],
      nextGameAmount: null,
      won: null,
    },
    log: [],
    answerLog: [],
    forcedScore: null,
    winnerTeamId: null,
    startedAt: null,
    completedAt: null,
    version: 0,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function isUndoable(action: GameAction): boolean {
  return !NON_UNDOABLE_ACTIONS.includes(action.type);
}

export function reduce(state: GameState, action: GameAction, ctx: EngineContext): GameState {
  const next = applyAction(state, action, ctx);
  return next === state ? state : { ...next, version: state.version + 1 };
}

function applyAction(state: GameState, action: GameAction, ctx: EngineContext): GameState {
  switch (action.type) {
    case 'START_GAME':
      return startGame(state, ctx);
    case 'ADVANCE':
      return advance(state, ctx);
    case 'SHOW_TEAM_INTRO':
      expectPhase(state, ['INTRO', 'LOBBY']);
      return setPhase(state, 'TEAM_INTRO', ctx, 'Team introduction');
    case 'START_ROUND':
      expectPhase(state, ['TEAM_INTRO', 'ROUND_INTRO', 'INTRO']);
      return startRound(state, ctx);
    case 'REVEAL_QUESTION':
      return revealQuestion(state, ctx);
    case 'REVEAL_INSTRUCTIONS':
      return revealInstructions(state, ctx);
    case 'REVEAL_BOARD':
      return revealBoard(state, ctx);
    case 'SET_TURN_ORDER':
      return setTurnOrder(state, action.teamIds, ctx);
    case 'SELECT_TEAM':
      return selectTeam(state, action.teamId, ctx);
    case 'OPEN_ANSWERS':
      return openAnswers(state, ctx);
    case 'SUBMIT_ANSWER':
      return submitAnswer(state, action, ctx);
    case 'CLEAR_ANSWER':
      return clearAnswer(state, action.teamId, action.poolIndex ?? null, ctx);
    case 'LOCK_ANSWER':
      return lockAnswer(state, ctx);
    case 'UNLOCK_ANSWER':
      return unlockAnswer(state, ctx);
    case 'MARK_CORRECT':
      return markCorrect(state, action.answerId, ctx);
    case 'MARK_INCORRECT':
      return markIncorrect(state, ctx);
    case 'OVERRIDE_SCORE':
      return overrideScore(state, action.score, ctx);
    case 'REVEAL_SCORE':
      return revealScore(state, ctx);
    case 'SCORE_REVEAL_COMPLETE':
      return completeScoreReveal(state, ctx);
    case 'NEXT_TEAM':
      return nextTeam(state, ctx);
    case 'REVEAL_LOW_ANSWERS':
      return revealResults(state, 'low', ctx);
    case 'REVEAL_HIGH_ANSWERS':
      return revealResults(state, 'high', ctx);
    case 'SHOW_LEADERBOARD':
      return showLeaderboard(state, ctx);
    case 'END_PASS':
      return endPass(state, ctx);
    case 'END_ROUND':
      return endRound(state, ctx);
    case 'ELIMINATE':
      return eliminate(state, action.teamIds, ctx);
    case 'START_TIEBREAK':
      return startTiebreak(state, action.questionId, ctx);
    case 'NEXT_ROUND':
      return nextRound(state, ctx);
    case 'H2H_SET_FIRST':
      return h2hSetFirst(state, action.teamId, ctx);
    case 'H2H_NEXT_QUESTION':
      return h2hNextQuestion(state, ctx);
    case 'START_FINAL':
      expectPhase(state, ['FINAL_INTRO']);
      return setPhase(state, 'FINAL_CATEGORY_SELECTION', ctx, 'Final: category selection');
    case 'FINAL_SELECT_CATEGORY':
      return finalSelectCategory(state, action.categoryId, ctx);
    case 'FINAL_REVEAL_PROMPTS':
      return finalRevealPrompts(state, ctx);
    case 'FINAL_START_DISCUSSION':
      return finalStartDiscussion(state, ctx);
    case 'FINAL_SUBMIT_ANSWERS':
      return finalSubmitAnswers(state, action.answers, ctx);
    case 'FINAL_LOCK_ANSWERS':
      return finalLockAnswers(state, ctx);
    case 'FINAL_OVERRIDE':
      return finalOverride(state, action, ctx);
    case 'FINAL_REVEAL_NEXT':
      return finalRevealNext(state, ctx);
    case 'FINAL_REVEAL_COMPLETE':
      return finalRevealComplete(state, ctx);
    case 'FINAL_FINISH':
      return finalFinish(state, ctx);
    case 'END_GAME':
      return endGame(state, ctx);
    case 'TIMER_START':
      return timerStart(state, action.kind, action.seconds, ctx);
    case 'TIMER_PAUSE':
      return timerPause(state, ctx);
    case 'TIMER_RESUME':
      return timerResume(state, ctx);
    case 'TIMER_RESET':
      return timerReset(state, ctx);
    case 'TEAM_PRESENCE':
      return { ...state, teams: state.teams.map((t) => (t.id === action.teamId ? { ...t, connected: action.connected } : t)) };
    case 'RENAME_TEAM':
      return log({ ...state, teams: state.teams.map((t) => (t.id === action.teamId ? { ...t, name: action.name.trim() || t.name } : t)) }, ctx, 'RENAME_TEAM', `Team renamed to ${action.name}`);
    case 'DEBUG_FORCE_SCORE':
      return log({ ...state, forcedScore: action.score }, ctx, 'DEBUG_FORCE_SCORE', action.score === null ? 'Forced score cleared' : `Next score forced to ${action.score}`);
    case 'DEBUG_SKIP_TO_H2H':
      return debugSkipToH2H(state, ctx);
    case 'DEBUG_SKIP_TO_FINAL':
      return debugSkipToFinal(state, ctx);
    case 'DEBUG_FORCE_FINAL':
      return debugForceFinal(state, action.outcome, ctx);
    default: {
      const never: never = action;
      throw new EngineError(`Unknown action ${(never as GameAction).type}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Generic utilities
// ---------------------------------------------------------------------------

function expectPhase(state: GameState, phases: Phase[]) {
  if (!phases.includes(state.phase)) {
    throw new EngineError(`Action not allowed in phase ${state.phase}`, 'WRONG_PHASE');
  }
}

function log(state: GameState, ctx: EngineContext, type: string, summary: string): GameState {
  const entry = { at: ctx.now, type, summary };
  const logList = [...state.log, entry];
  return { ...state, log: logList.length > 200 ? logList.slice(logList.length - 200) : logList };
}

function setPhase(state: GameState, phase: Phase, ctx: EngineContext, summary?: string): GameState {
  const next = { ...state, previousPhase: state.phase, phase };
  return summary ? log(next, ctx, `PHASE_${phase}`, summary) : next;
}

function requireRun(state: GameState): QuestionRun {
  if (!state.question) throw new EngineError('No active question', 'NO_QUESTION');
  return state.question;
}

function requireQuestion(ctx: EngineContext, questionId: string): QuestionDef {
  const q = ctx.questions[questionId];
  if (!q) throw new EngineError(`Question ${questionId} is not loaded`, 'MISSING_QUESTION');
  return q;
}

function withRun(state: GameState, run: QuestionRun): GameState {
  return { ...state, question: run };
}

function updateSubmission(run: QuestionRun, sub: Submission): QuestionRun {
  return { ...run, submissions: { ...run.submissions, [submissionKey(sub.teamId, sub.poolIndex)]: sub } };
}

function money(state: GameState, amount: number) {
  return formatMoney(amount, state.config.currency);
}

// ---------------------------------------------------------------------------
// Game start / rounds
// ---------------------------------------------------------------------------

function startGame(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['LOBBY']);
  if (state.teams.length < 2) throw new EngineError('At least two teams are required', 'NOT_ENOUGH_TEAMS');
  return log(setPhase({ ...state, startedAt: ctx.now }, 'INTRO', ctx), ctx, 'GAME_STARTED', 'Game started');
}

function createRun(state: GameState, ctx: EngineContext, questionId: string, stage: Stage, participantIds: string[], passIndex: number, tiebreakNumber = 0, explicitOrder?: string[]): QuestionRun {
  const q = requireQuestion(ctx, questionId);
  const order = explicitOrder ?? defaultTurnOrder(participantIds, state.roundIndex + passIndex);
  return {
    questionId,
    stage,
    roundIndex: state.roundIndex,
    passIndex,
    participantTeamIds: participantIds,
    turns: buildTurns(order, q.format),
    turnIndex: 0,
    submissions: {},
    revealed: { question: false, instructions: false, board: false },
    usedBoardItemIds: [],
    resultsRevealed: { low: false, high: false },
    tiebreakNumber,
  };
}

function startRound(state: GameState, ctx: EngineContext): GameState {
  const round = currentRound(state);
  if (!round) throw new EngineError('No round configured', 'NO_ROUND');
  if (round.type === 'HEAD_TO_HEAD') return enterHeadToHead(state, ctx);
  if (round.type === 'FINAL') return enterFinal(state, ctx);
  const questionId = round.questionIds[0];
  if (!questionId) throw new EngineError('Round has no question for pass 1', 'NO_QUESTION_ASSIGNED');
  const teams = activeTeams(state).map((t) => t.id);
  const run = createRun(state, ctx, questionId, 'ELIMINATION', teams, 0);
  const roundScores = { ...state.roundScores, [state.roundIndex]: state.roundScores[state.roundIndex] ?? Object.fromEntries(teams.map((id) => [id, Array(round.passes).fill(null)])) };
  return log(setPhase({ ...state, passIndex: 0, question: run, pendingElimination: null, roundScores }, 'QUESTION_INTRO', ctx), ctx, 'ROUND_STARTED', `Round ${state.roundIndex + 1} started`);
}

function startPass(state: GameState, ctx: EngineContext, passIndex: number): GameState {
  const round = currentRound(state)!;
  const questionId = round.questionIds[passIndex];
  if (!questionId) throw new EngineError(`Round has no question for pass ${passIndex + 1}`, 'NO_QUESTION_ASSIGNED');
  const teams = activeTeams(state).map((t) => t.id);
  const run = createRun(state, ctx, questionId, 'ELIMINATION', teams, passIndex);
  return log(setPhase({ ...state, passIndex, question: run }, 'QUESTION_INTRO', ctx), ctx, 'PASS_STARTED', `Pass ${passIndex + 1} started`);
}

// ---------------------------------------------------------------------------
// Question flow
// ---------------------------------------------------------------------------

function revealQuestion(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['QUESTION_INTRO']);
  const run = requireRun(state);
  return log(setPhase(withRun(state, { ...run, revealed: { ...run.revealed, question: true } }), 'QUESTION_REVEALED', ctx), ctx, 'QUESTION_REVEALED', 'Question revealed');
}

function revealInstructions(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['QUESTION_REVEALED', 'ACCEPTING_ANSWER', 'ANSWER_LOCKED', 'SCORE_REVEALED']);
  const run = requireRun(state);
  return withRun(state, { ...run, revealed: { ...run.revealed, instructions: true } });
}

function revealBoard(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['QUESTION_REVEALED', 'ACCEPTING_ANSWER', 'ANSWER_LOCKED', 'SCORE_REVEALED']);
  const run = requireRun(state);
  return log(withRun(state, { ...run, revealed: { ...run.revealed, board: true } }), ctx, 'BOARD_REVEALED', 'Board revealed');
}

function setTurnOrder(state: GameState, teamIds: string[], ctx: EngineContext): GameState {
  expectPhase(state, ['QUESTION_INTRO', 'QUESTION_REVEALED']);
  const run = requireRun(state);
  const q = requireQuestion(ctx, run.questionId);
  const valid = teamIds.filter((id) => run.participantTeamIds.includes(id));
  const missing = run.participantTeamIds.filter((id) => !valid.includes(id));
  return log(withRun(state, { ...run, turns: buildTurns([...valid, ...missing], q.format), turnIndex: 0 }), ctx, 'TURN_ORDER_SET', 'Order of play set');
}

function openAnswers(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['QUESTION_REVEALED', 'QUESTION_INTRO']);
  const run = requireRun(state);
  const q = requireQuestion(ctx, run.questionId);
  const turn = currentTurn(run);
  if (!turn) throw new EngineError('No turns configured', 'NO_TURNS');
  const revealed = { question: true, instructions: true, board: run.revealed.board || usesBoard(q.format) };
  let next = setPhase(withRun(state, { ...run, revealed }), 'ACCEPTING_ANSWER', ctx, `${teamById(state, turn.teamId).name} to answer`);
  if (state.config.teamAnswerSeconds > 0) next = timerStart(next, 'TEAM', state.config.teamAnswerSeconds, ctx);
  return next;
}

function selectTeam(state: GameState, teamId: string, ctx: EngineContext): GameState {
  expectPhase(state, ['ACCEPTING_ANSWER', 'SCORE_REVEALED', 'QUESTION_REVEALED', 'ANSWER_LOCKED']);
  const run = requireRun(state);
  const idx = run.turns.findIndex((t) => t.teamId === teamId && !run.submissions[submissionKey(t.teamId, t.poolIndex)]?.revealed);
  if (idx < 0) throw new EngineError('That team has already answered', 'TEAM_DONE');
  const next = setPhase(withRun(state, { ...run, turnIndex: idx }), 'ACCEPTING_ANSWER', ctx, `${teamById(state, teamId).name} to answer`);
  return state.config.teamAnswerSeconds > 0 ? timerStart(next, 'TEAM', state.config.teamAnswerSeconds, ctx) : next;
}

function submitAnswer(state: GameState, action: Extract<GameAction, { type: 'SUBMIT_ANSWER' }>, ctx: EngineContext): GameState {
  expectPhase(state, ['ACCEPTING_ANSWER']);
  const run = requireRun(state);
  const turn = currentTurn(run);
  if (!turn) throw new EngineError('No active turn', 'NO_TURN');
  if (turn.teamId !== action.teamId) throw new EngineError('It is not this team’s turn', 'NOT_YOUR_TURN');
  const key = submissionKey(turn.teamId, turn.poolIndex);
  const existing = run.submissions[key];
  if (existing?.locked) throw new EngineError('Answer already locked', 'ALREADY_LOCKED');
  const q = requireQuestion(ctx, run.questionId);
  const text = (action.text ?? '').trim().slice(0, 120);
  const boardItemId = action.boardItemId ?? null;
  if (requiresBoardSelection(q.format)) {
    if (!boardItemId) throw new EngineError('Choose a card from the board', 'BOARD_ITEM_REQUIRED');
    if (!q.boardItems.some((b) => b.id === boardItemId)) throw new EngineError('Unknown board item', 'BOARD_ITEM_UNKNOWN');
    if (run.usedBoardItemIds.includes(boardItemId)) throw new EngineError('That card has already been taken', 'BOARD_ITEM_USED');
  }
  if (requiresTypedAnswer(q.format) && !text) throw new EngineError('Enter an answer', 'TEXT_REQUIRED');
  const base = existing ?? emptySubmission(turn.teamId, turn.poolIndex);
  const sub: Submission = { ...base, text, boardItemId, playerName: action.playerName ?? base.playerName, submittedBy: action.by };
  const team = teamById(state, turn.teamId);
  return log(withRun(state, updateSubmission(run, sub)), ctx, 'ANSWER_SUBMITTED', `${team.name} submitted an answer`);
}

function clearAnswer(state: GameState, teamId: string, poolIndex: number | null, ctx: EngineContext): GameState {
  expectPhase(state, ['ACCEPTING_ANSWER']);
  const run = requireRun(state);
  const turn = currentTurn(run);
  const pool = poolIndex ?? turn?.poolIndex ?? 0;
  const key = submissionKey(teamId, pool);
  const existing = run.submissions[key];
  if (!existing || existing.locked) return state;
  const submissions = { ...run.submissions };
  delete submissions[key];
  return log(withRun(state, { ...run, submissions }), ctx, 'ANSWER_CLEARED', 'Answer cleared');
}

function computeScore(state: GameState, q: QuestionDef, sub: Submission): ScoredAnswer {
  const incorrect = state.config.incorrectScore;
  if (state.forcedScore !== null) {
    const s = state.forcedScore;
    return { score: s, correct: s < incorrect, isZero: s === 0, matchedAnswerId: null, canonical: sub.text || null, confidence: null };
  }
  switch (q.format) {
    case 'OPEN':
      return scoreAnswer(sub.text, poolAnswers(q, 0), incorrect);
    case 'LINKED':
      return scoreAnswer(sub.text, poolAnswers(q, sub.poolIndex), incorrect);
    case 'BOARD':
      return scoreBoardSelection(sub.boardItemId ?? '', q.answers, incorrect);
    case 'CLUES':
    case 'PICTURE':
    case 'PARTIAL':
      return scoreAnswer(sub.text, q.answers.filter((a) => a.boardItemId === sub.boardItemId), incorrect);
  }
}

function applyScored(sub: Submission, scored: ScoredAnswer, override: Submission['override'] = null): Submission {
  return { ...sub, locked: true, score: scored.score, correct: scored.correct, isZero: scored.isZero, matchedAnswerId: scored.matchedAnswerId, canonical: scored.canonical, override };
}

function lockAnswer(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['ACCEPTING_ANSWER']);
  const run = requireRun(state);
  const sub = currentSubmission(run);
  if (!sub) throw new EngineError('No answer to lock', 'NO_ANSWER');
  const q = requireQuestion(ctx, run.questionId);
  if (requiresTypedAnswer(q.format) && !sub.text) throw new EngineError('No answer to lock', 'NO_ANSWER');
  const scored = computeScore(state, q, sub);
  const locked = applyScored(sub, scored);
  let next: GameState = { ...state, forcedScore: null, timer: state.timer.kind === 'TEAM' ? { kind: 'NONE', durationMs: 0, endsAt: null, remainingMs: 0, running: false } : state.timer };
  next = log(setPhase(withRun(next, updateSubmission(run, locked)), 'ANSWER_LOCKED', ctx), ctx, 'ANSWER_LOCKED', `${teamById(state, sub.teamId).name}: "${sub.text || sub.canonical || 'board selection'}" locked`);
  return state.config.autoReveal ? revealScore(next, ctx) : next;
}

function unlockAnswer(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['ANSWER_LOCKED']);
  const run = requireRun(state);
  const sub = currentSubmission(run);
  if (!sub) return state;
  const unlocked: Submission = { ...sub, locked: false, override: null, matchedAnswerId: null, canonical: null, score: 100, correct: false, isZero: false };
  return log(setPhase(withRun(state, updateSubmission(run, unlocked)), 'ACCEPTING_ANSWER', ctx), ctx, 'ANSWER_UNLOCKED', 'Answer unlocked');
}

function markCorrect(state: GameState, answerId: string | undefined, ctx: EngineContext): GameState {
  expectPhase(state, ['ANSWER_LOCKED', 'ACCEPTING_ANSWER']);
  const run = requireRun(state);
  const sub = currentSubmission(run);
  if (!sub) throw new EngineError('No answer to mark', 'NO_ANSWER');
  const q = requireQuestion(ctx, run.questionId);
  let candidates = q.answers.filter((a) => a.poolIndex === sub.poolIndex && a.correct);
  if (usesBoard(q.format) && q.format !== 'BOARD') candidates = candidates.filter((a) => a.boardItemId === sub.boardItemId);
  const answer = answerId ? q.answers.find((a) => a.id === answerId) : candidates.find((a) => a.id === sub.matchedAnswerId) ?? null;
  if (!answer) throw new EngineError('Choose the canonical answer this submission corresponds to', 'CANONICAL_REQUIRED');
  const scored = scoreFromAnswerDef({ ...answer, correct: true }, state.config.incorrectScore);
  const updated = applyScored(sub, scored, answerId ? 'CANONICAL' : 'CORRECT');
  return log(setPhase(withRun(state, updateSubmission(run, updated)), 'ANSWER_LOCKED', ctx), ctx, 'ANSWER_OVERRIDDEN', `Marked correct as "${answer.canonical}" (${scored.score})`);
}

function markIncorrect(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['ANSWER_LOCKED', 'ACCEPTING_ANSWER']);
  const run = requireRun(state);
  const sub = currentSubmission(run);
  if (!sub) throw new EngineError('No answer to mark', 'NO_ANSWER');
  const updated = applyScored(sub, { score: state.config.incorrectScore, correct: false, isZero: false, matchedAnswerId: null, canonical: null, confidence: null }, 'INCORRECT');
  return log(setPhase(withRun(state, updateSubmission(run, updated)), 'ANSWER_LOCKED', ctx), ctx, 'ANSWER_OVERRIDDEN', 'Marked incorrect');
}

function overrideScore(state: GameState, score: number, ctx: EngineContext): GameState {
  expectPhase(state, ['ANSWER_LOCKED', 'ACCEPTING_ANSWER']);
  const run = requireRun(state);
  const sub = currentSubmission(run);
  if (!sub) throw new EngineError('No answer to override', 'NO_ANSWER');
  const s = Math.min(100, Math.max(0, Math.round(score)));
  const updated = applyScored(sub, { score: s, correct: s < state.config.incorrectScore, isZero: s === 0, matchedAnswerId: sub.matchedAnswerId, canonical: sub.canonical ?? sub.text, confidence: null }, 'SCORE');
  return log(setPhase(withRun(state, updateSubmission(run, updated)), 'ANSWER_LOCKED', ctx), ctx, 'ANSWER_OVERRIDDEN', `Score overridden to ${s}`);
}

function revealScore(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['ANSWER_LOCKED']);
  const run = requireRun(state);
  const sub = currentSubmission(run);
  if (!sub?.locked) throw new EngineError('Lock the answer first', 'NOT_LOCKED');
  const updated: Submission = { ...sub, revealStartedAt: ctx.now };
  return log(setPhase(withRun(state, updateSubmission(run, updated)), 'REVEALING_SCORE', ctx), ctx, 'SCORE_REVEAL_STARTED', 'Revealing score');
}

/** Records the revealed score into the round / H2H ledgers and applies jackpot bonuses. */
function completeScoreReveal(state: GameState, ctx: EngineContext): GameState {
  if (state.phase !== 'REVEALING_SCORE') return state;
  const run = requireRun(state);
  const sub = currentSubmission(run);
  if (!sub) return state;
  const q = requireQuestion(ctx, run.questionId);
  const revealedSub: Submission = { ...sub, revealed: true };
  let newRun = updateSubmission(run, revealedSub);

  // Board bookkeeping
  if (sub.boardItemId) {
    const removeOnPick = q.format === 'BOARD' && (q.settings.removeOnPick ?? true);
    if (removeOnPick || (q.format !== 'BOARD' && sub.correct)) {
      newRun = { ...newRun, usedBoardItemIds: [...new Set([...newRun.usedBoardItemIds, sub.boardItemId])] };
    }
  }

  let next: GameState = withRun(state, newRun);
  const team = teamById(state, sub.teamId);
  next = { ...next, answerLog: [...state.answerLog, { at: ctx.now, stage: run.stage, roundIndex: run.roundIndex, passIndex: run.passIndex, teamId: sub.teamId, questionId: run.questionId, playerName: sub.playerName, text: sub.text || sub.canonical || '', matchedAnswerId: sub.matchedAnswerId, canonical: sub.canonical, score: sub.score, correct: sub.correct, isZero: sub.isZero, overridden: sub.override !== null }] };

  // Ledgers
  if (run.stage === 'ELIMINATION') {
    const roundScores = { ...state.roundScores };
    const scores = { ...(roundScores[run.roundIndex] ?? {}) };
    const passes = [...(scores[sub.teamId] ?? Array(currentRound(state)?.passes ?? 1).fill(null))];
    const subs = teamSubmissions(newRun, sub.teamId).filter((s) => s.revealed);
    passes[run.passIndex] = q.format === 'LINKED' && subs.length > 1 ? combineLinkedScores(subs[0].score, subs[1].score, state.config.linkedScoring) : subs.reduce((acc, s) => acc + s.score, 0);
    scores[sub.teamId] = passes;
    roundScores[run.roundIndex] = scores;
    next = { ...next, roundScores };
  }

  // Jackpot
  if (sub.isZero && run.stage !== 'FINAL') {
    const amount = state.jackpot.amount + state.config.zeroBonus;
    next = {
      ...next,
      jackpot: {
        ...state.jackpot,
        amount,
        zeroCount: state.jackpot.zeroCount + 1,
        history: [...state.jackpot.history, { at: ctx.now, delta: state.config.zeroBonus, reason: `${state.config.zeroTerm} by ${team.name}`, amount }],
      },
    };
    next = log(next, ctx, 'JACKPOT_CHANGED', `${state.config.zeroTerm}! Jackpot now ${money(state, amount)}`);
  }

  next = log(setPhase(next, 'SCORE_REVEALED', ctx), ctx, 'SCORE_REVEALED', `${team.name}: ${sub.correct ? sub.canonical ?? sub.text : 'incorrect'} → ${sub.score}`);
  return next;
}

function nextTeam(state: GameState, ctx: EngineContext): GameState {
  let s = state;
  if (s.phase === 'REVEALING_SCORE') s = completeScoreReveal(s, ctx);
  expectPhase(s, ['SCORE_REVEALED']);
  const run = requireRun(s);
  if (allTurnsRevealed(run)) return finishQuestion(s, ctx);
  // next unrevealed turn after the current index (wrapping)
  const n = run.turns.length;
  for (let i = 1; i <= n; i++) {
    const idx = (run.turnIndex + i) % n;
    const t = run.turns[idx];
    if (!run.submissions[submissionKey(t.teamId, t.poolIndex)]?.revealed) {
      let next = setPhase(withRun(s, { ...run, turnIndex: idx }), 'ACCEPTING_ANSWER', ctx, `${teamById(s, t.teamId).name} to answer`);
      if (s.config.teamAnswerSeconds > 0) next = timerStart(next, 'TEAM', s.config.teamAnswerSeconds, ctx);
      return next;
    }
  }
  return finishQuestion(s, ctx);
}

/** All teams have answered the current question: branch on the stage. */
function finishQuestion(state: GameState, ctx: EngineContext): GameState {
  const run = requireRun(state);
  if (run.stage === 'HEAD_TO_HEAD') return h2hResolve(state, ctx);
  if (run.stage === 'FINAL') throw new EngineError('Final answers are revealed through FINAL_REVEAL_NEXT', 'WRONG_STAGE');
  return setPhase(state, 'PASS_RESULTS', ctx, 'Pass complete');
}

function revealResults(state: GameState, which: 'low' | 'high', ctx: EngineContext): GameState {
  expectPhase(state, ['PASS_RESULTS', 'SCORE_REVEALED']);
  const run = requireRun(state);
  let s = state;
  if (s.phase === 'SCORE_REVEALED') {
    if (!allTurnsRevealed(run)) throw new EngineError('Not every team has answered yet', 'TURNS_REMAINING');
    s = setPhase(s, 'PASS_RESULTS', ctx, 'Pass complete');
  }
  return log(withRun(s, { ...run, resultsRevealed: { ...run.resultsRevealed, [which]: true } }), ctx, which === 'low' ? 'LOW_ANSWERS_REVEALED' : 'HIGH_ANSWERS_REVEALED', which === 'low' ? 'Lowest answers revealed' : 'Most common answers revealed');
}

function showLeaderboard(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['PASS_RESULTS', 'SCORE_REVEALED', 'ROUND_RESULTS', 'ELIMINATION']);
  if (state.phase === 'ROUND_RESULTS') return state;
  return endPass(state, ctx);
}

/** Ends the current pass: either start the next pass or compute round results. */
function endPass(state: GameState, ctx: EngineContext): GameState {
  let s = state;
  if (s.phase === 'REVEALING_SCORE') s = completeScoreReveal(s, ctx);
  expectPhase(s, ['PASS_RESULTS', 'SCORE_REVEALED']);
  const run = requireRun(s);
  if (!allTurnsRevealed(run)) throw new EngineError('Not every team has answered yet', 'TURNS_REMAINING');
  if (run.stage === 'TIEBREAK') return computeRoundResults(s, ctx);
  const round = currentRound(s)!;
  if (run.passIndex + 1 < round.passes) return startPass(s, ctx, run.passIndex + 1);
  return computeRoundResults(s, ctx);
}

function endRound(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['PASS_RESULTS', 'SCORE_REVEALED', 'ROUND_RESULTS']);
  if (state.phase === 'ROUND_RESULTS') return state;
  return computeRoundResults(state, ctx);
}

function computeRoundResults(state: GameState, ctx: EngineContext): GameState {
  const run = requireRun(state);
  const round = currentRound(state)!;
  const roundScores = state.roundScores[state.roundIndex] ?? {};
  const totals = calculateRoundTotals(roundScores);
  let pending = state.pendingElimination;
  if (run.stage === 'TIEBREAK' && pending) {
    const tbScores: Record<string, number> = {};
    for (const id of pending.tied) tbScores[id] = teamSubmissions(run, id).filter((s) => s.revealed).reduce((a, s) => a + s.score, 0);
    const r = resolveTie(tbScores, pending.slots);
    pending = { eliminate: [...pending.eliminate, ...r.eliminate], tied: r.tied, slots: r.slots };
  } else {
    const r = getEliminatedTeams(totals, round.eliminateCount);
    pending = { eliminate: r.eliminate, tied: r.tied, slots: r.slots };
  }
  return log(setPhase({ ...state, pendingElimination: pending }, 'ROUND_RESULTS', ctx), ctx, 'ROUND_COMPLETED', pending.tied.length ? `Round ${state.roundIndex + 1} complete: tie-break required` : `Round ${state.roundIndex + 1} complete`);
}

function startTiebreak(state: GameState, questionId: string, ctx: EngineContext): GameState {
  expectPhase(state, ['ROUND_RESULTS', 'TIEBREAK_INTRO']);
  const pending = state.pendingElimination;
  if (!pending || pending.tied.length === 0) throw new EngineError('No tie to break', 'NO_TIE');
  if (state.tiebreakQuestionsUsed.includes(questionId)) throw new EngineError('Tie-break question already used', 'QUESTION_USED');
  const prevNumber = state.question?.stage === 'TIEBREAK' ? state.question.tiebreakNumber : 0;
  const run = createRun(state, ctx, questionId, 'TIEBREAK', pending.tied, state.passIndex, prevNumber + 1);
  return log(setPhase({ ...state, question: run, tiebreakQuestionsUsed: [...state.tiebreakQuestionsUsed, questionId] }, 'QUESTION_INTRO', ctx), ctx, 'TIEBREAK_STARTED', `Tie-break between ${pending.tied.map((id) => teamById(state, id).name).join(' and ')}`);
}

function eliminate(state: GameState, teamIds: string[] | undefined, ctx: EngineContext): GameState {
  expectPhase(state, ['ROUND_RESULTS', 'TIEBREAK_INTRO']);
  const pending = state.pendingElimination;
  let ids = teamIds;
  if (!ids) {
    if (!pending) throw new EngineError('Round results not computed', 'NO_RESULTS');
    if (pending.tied.length) throw new EngineError('Teams are tied; run a tie-break or eliminate manually', 'TIE_UNRESOLVED');
    ids = pending.eliminate;
  }
  const names = ids.map((id) => teamById(state, id).name);
  const teams = state.teams.map((t) => (ids!.includes(t.id) ? { ...t, eliminatedRound: state.roundIndex } : t));
  const eliminations = [...state.eliminations, { roundIndex: state.roundIndex, teamIds: ids, tieTeamIds: pending?.tied ?? [] }];
  return log(setPhase({ ...state, teams, eliminations, pendingElimination: { eliminate: ids, tied: [], slots: 0 } }, 'ELIMINATION', ctx), ctx, 'TEAM_ELIMINATED', `${names.join(', ')} eliminated`);
}

function nextRound(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['ELIMINATION', 'ROUND_RESULTS', 'HEAD_TO_HEAD_RESULT']);
  if (state.phase === 'ROUND_RESULTS' && state.pendingElimination && (state.pendingElimination.tied.length || state.pendingElimination.eliminate.length)) {
    throw new EngineError('Resolve the elimination first', 'ELIMINATION_PENDING');
  }
  const idx = state.roundIndex + 1;
  const round = state.config.rounds[idx];
  if (!round) return endGame(state, ctx);
  const next: GameState = { ...state, roundIndex: idx, passIndex: 0, question: null, pendingElimination: null };
  const alive = activeTeams(next);
  if (round.type === 'ELIMINATION' && alive.length <= 2) {
    // Structure drifted (e.g. fewer teams than planned): skip ahead to the H2H round.
    const h2hIdx = state.config.rounds.findIndex((r, i) => i >= idx && r.type === 'HEAD_TO_HEAD');
    if (h2hIdx >= 0) return enterHeadToHead({ ...next, roundIndex: h2hIdx }, ctx);
  }
  if (round.type === 'HEAD_TO_HEAD') return alive.length === 1 ? enterFinal(next, ctx) : enterHeadToHead(next, ctx);
  if (round.type === 'FINAL') return enterFinal(next, ctx);
  return log(setPhase(next, 'ROUND_INTRO', ctx), ctx, 'ROUND_INTRO', `Round ${idx + 1}`);
}

// ---------------------------------------------------------------------------
// Head-to-Head
// ---------------------------------------------------------------------------

function enterHeadToHead(state: GameState, ctx: EngineContext): GameState {
  const alive = activeTeams(state);
  if (alive.length !== 2) throw new EngineError(`Head-to-Head needs exactly two teams (have ${alive.length})`, 'WRONG_TEAM_COUNT');
  const round = currentRound(state)!;
  const totals = calculateGameTotals(state.roundScores);
  const [a, b] = alive;
  const advantage = (totals[a.id] ?? 0) <= (totals[b.id] ?? 0) ? a.id : b.id;
  const other = advantage === a.id ? b.id : a.id;
  let first: string | null = null;
  if (state.config.h2hAdvantage === 'BEST_FIRST') first = advantage;
  if (state.config.h2hAdvantage === 'BEST_SECOND') first = other;
  const h2h = state.h2h ?? {
    teamIds: [a.id, b.id] as [string, string],
    points: { [a.id]: 0, [b.id]: 0 },
    questionIndex: 0,
    results: [],
    advantageTeamId: advantage,
    firstTeamId: first,
    winnerTeamId: null,
    bestOf: round.bestOf,
  };
  return log(setPhase({ ...state, h2h, question: null }, 'HEAD_TO_HEAD_INTRO', ctx), ctx, 'HEAD_TO_HEAD', `Head-to-Head: ${a.name} v ${b.name}`);
}

function h2hSetFirst(state: GameState, teamId: string, ctx: EngineContext): GameState {
  expectPhase(state, ['HEAD_TO_HEAD_INTRO']);
  if (!state.h2h || !state.h2h.teamIds.includes(teamId)) throw new EngineError('Team is not in the Head-to-Head', 'WRONG_TEAM');
  return log({ ...state, h2h: { ...state.h2h, firstTeamId: teamId } }, ctx, 'H2H_ORDER', `${teamById(state, teamId).name} answers first`);
}

function h2hNextQuestion(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['HEAD_TO_HEAD_INTRO']);
  const h2h = state.h2h;
  if (!h2h) throw new EngineError('Head-to-Head not initialised', 'NO_H2H');
  if (!h2h.firstTeamId) throw new EngineError('Decide which team answers first', 'ORDER_REQUIRED');
  const round = currentRound(state)!;
  const questionId = round.questionIds[h2h.questionIndex];
  if (!questionId) throw new EngineError('No Head-to-Head question left in the plan', 'NO_QUESTION_ASSIGNED');
  const second = h2h.teamIds.find((id) => id !== h2h.firstTeamId)!;
  const run = createRun(state, ctx, questionId, 'HEAD_TO_HEAD', [...h2h.teamIds], h2h.questionIndex, 0, [h2h.firstTeamId, second]);
  return log(setPhase({ ...state, question: run }, 'QUESTION_INTRO', ctx), ctx, 'H2H_QUESTION', `Head-to-Head question ${h2h.questionIndex + 1}`);
}

function h2hResolve(state: GameState, ctx: EngineContext): GameState {
  const run = requireRun(state);
  const h2h = state.h2h!;
  const scores: Record<string, number> = {};
  for (const id of h2h.teamIds) scores[id] = teamSubmissions(run, id).filter((s) => s.revealed).reduce((a, s) => a + s.score, 0);
  const winner = resolveHeadToHeadQuestion(scores);
  const points = { ...h2h.points };
  if (winner) points[winner] = (points[winner] ?? 0) + 1;
  const matchWinner = headToHeadWinner(points, h2h.bestOf);
  const results = [...h2h.results, { questionId: run.questionId, scores, winnerTeamId: winner }];
  const nextFirst = h2h.teamIds.find((id) => id !== h2h.firstTeamId) ?? null;
  const newH2H = { ...h2h, points, results, winnerTeamId: matchWinner, questionIndex: h2h.questionIndex + 1, firstTeamId: nextFirst };
  let next = setPhase({ ...state, h2h: newH2H }, 'HEAD_TO_HEAD_RESULT', ctx);
  next = log(next, ctx, 'HEAD_TO_HEAD_POINT', winner ? `Point to ${teamById(state, winner).name}` : 'Tied question: no point');
  if (matchWinner) {
    const loser = h2h.teamIds.find((id) => id !== matchWinner)!;
    next = { ...next, teams: next.teams.map((t) => (t.id === loser ? { ...t, eliminatedRound: state.roundIndex } : t)), eliminations: [...next.eliminations, { roundIndex: state.roundIndex, teamIds: [loser], tieTeamIds: [] }] };
    next = log(next, ctx, 'HEAD_TO_HEAD_WON', `${teamById(state, matchWinner).name} wins the Head-to-Head`);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Final
// ---------------------------------------------------------------------------

function enterFinal(state: GameState, ctx: EngineContext): GameState {
  const alive = activeTeams(state);
  if (alive.length !== 1) throw new EngineError(`The Final needs exactly one team (have ${alive.length})`, 'WRONG_TEAM_COUNT');
  const round = currentRound(state);
  if (!round || round.type !== 'FINAL') throw new EngineError('Current round is not the Final', 'WRONG_ROUND');
  const options = round.finalCategoryIds.map((id) => ctx.finalCategories[id]).filter(Boolean).map((c) => ({ id: c.id, title: c.title }));
  if (options.length === 0) throw new EngineError('No final categories configured', 'NO_FINAL_CATEGORIES');
  const final = state.final ?? {
    teamId: alive[0].id,
    categoryOptions: options,
    chosenCategoryId: null,
    promptsRevealed: false,
    answers: [],
    results: [],
    revealedCount: 0,
    completedCount: 0,
    outcome: null,
    jackpotAtStake: state.jackpot.amount,
  };
  return log(setPhase({ ...state, final, question: null, winnerTeamId: alive[0].id }, 'FINAL_INTRO', ctx), ctx, 'FINAL', `${alive[0].name} reach the Final for ${money(state, state.jackpot.amount)}`);
}

function finalSelectCategory(state: GameState, categoryId: string, ctx: EngineContext): GameState {
  expectPhase(state, ['FINAL_CATEGORY_SELECTION', 'FINAL_INTRO']);
  const final = state.final!;
  const option = final.categoryOptions.find((c) => c.id === categoryId);
  if (!option) throw new EngineError('Unknown category', 'UNKNOWN_CATEGORY');
  return log(setPhase({ ...state, final: { ...final, chosenCategoryId: categoryId } }, 'FINAL_PROMPTS', ctx), ctx, 'FINAL_CATEGORY', `Final category: ${option.title}`);
}

function finalRevealPrompts(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['FINAL_PROMPTS']);
  return log({ ...state, final: { ...state.final!, promptsRevealed: true } }, ctx, 'FINAL_PROMPTS', 'Final prompts revealed');
}

function finalStartDiscussion(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['FINAL_PROMPTS']);
  const next = setPhase({ ...state, final: { ...state.final!, promptsRevealed: true } }, 'FINAL_DISCUSSION', ctx, 'Final discussion');
  return timerStart(next, 'FINAL', state.config.finalDiscussionSeconds, ctx);
}

function finalSubmitAnswers(state: GameState, answers: { text: string; promptId?: string | null }[], ctx: EngineContext): GameState {
  expectPhase(state, ['FINAL_DISCUSSION', 'FINAL_SUBMISSION']);
  const final = state.final!;
  if (final.results.length) throw new EngineError('Final answers already locked', 'ALREADY_LOCKED');
  const cleaned = answers.map((a) => ({ text: (a.text ?? '').trim().slice(0, 120), promptId: a.promptId ?? null })).slice(0, state.config.finalAnswerCount);
  return log(setPhase({ ...state, final: { ...final, answers: cleaned } }, 'FINAL_SUBMISSION', ctx), ctx, 'FINAL_ANSWERS_SUBMITTED', `${cleaned.filter((a) => a.text).length} final answers entered`);
}

function finalCategoryPrompts(state: GameState, ctx: EngineContext): QuestionDef[] {
  const final = state.final!;
  const cat = final.chosenCategoryId ? ctx.finalCategories[final.chosenCategoryId] : null;
  if (!cat) throw new EngineError('Final category not loaded', 'NO_FINAL_CATEGORY');
  return cat.prompts;
}

function scoreFinalAnswer(state: GameState, prompts: QuestionDef[], answer: { text: string; promptId: string | null }): FinalAnswerResult {
  const incorrect = state.config.incorrectScore;
  const base: FinalAnswerResult = { text: answer.text, promptId: answer.promptId, matchedAnswerId: null, canonical: null, score: incorrect, correct: false, isZero: false, override: null, revealStartedAt: null };
  if (!answer.text) return base;
  const candidates = state.config.finalAnswerMode === 'PER_PROMPT' && answer.promptId ? prompts.filter((p) => p.id === answer.promptId) : prompts;
  let best: { r: ScoredAnswer; promptId: string } | null = null;
  for (const p of candidates) {
    const r = scoreAnswer(answer.text, p.answers, incorrect);
    if (r.correct && (!best || r.score < best.r.score)) best = { r, promptId: p.id };
  }
  if (!best) return base;
  return { ...base, promptId: best.promptId, matchedAnswerId: best.r.matchedAnswerId, canonical: best.r.canonical, score: best.r.score, correct: true, isZero: best.r.isZero };
}

function finalLockAnswers(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['FINAL_SUBMISSION', 'FINAL_DISCUSSION']);
  const final = state.final!;
  const count = state.config.finalAnswerCount;
  const answers = [...final.answers];
  while (answers.length < count) answers.push({ text: '', promptId: null });
  const prompts = finalCategoryPrompts(state, ctx);
  const results = answers.map((a) => scoreFinalAnswer(state, prompts, a));
  const next: GameState = { ...state, final: { ...final, answers, results, revealedCount: 0, completedCount: 0 }, timer: { kind: 'NONE', durationMs: 0, endsAt: null, remainingMs: 0, running: false } };
  return log(setPhase(next, 'FINAL_REVEAL', ctx), ctx, 'FINAL_ANSWERS_LOCKED', 'Final answers locked');
}

function finalOverride(state: GameState, action: Extract<GameAction, { type: 'FINAL_OVERRIDE' }>, ctx: EngineContext): GameState {
  expectPhase(state, ['FINAL_REVEAL']);
  const final = state.final!;
  const result = final.results[action.index];
  if (!result) throw new EngineError('No such final answer', 'BAD_INDEX');
  if (action.index < final.revealedCount) throw new EngineError('That answer has already been revealed', 'ALREADY_REVEALED');
  let updated: FinalAnswerResult;
  if (action.override === 'INCORRECT') {
    updated = { ...result, score: state.config.incorrectScore, correct: false, isZero: false, matchedAnswerId: null, canonical: null, override: 'INCORRECT' };
  } else if (action.override === 'SCORE') {
    const s = Math.min(100, Math.max(0, Math.round(action.score ?? 100)));
    updated = { ...result, score: s, correct: s < state.config.incorrectScore, isZero: s === 0, override: 'SCORE', canonical: result.canonical ?? result.text };
  } else {
    const prompts = finalCategoryPrompts(state, ctx);
    const all = prompts.flatMap((p) => p.answers.map((a) => ({ a, promptId: p.id })));
    const found = action.answerId ? all.find((x) => x.a.id === action.answerId) : null;
    if (!found) throw new EngineError('Choose the canonical answer', 'CANONICAL_REQUIRED');
    const r = scoreFromAnswerDef({ ...found.a, correct: true }, state.config.incorrectScore);
    updated = { ...result, promptId: found.promptId, matchedAnswerId: r.matchedAnswerId, canonical: r.canonical, score: r.score, correct: true, isZero: r.isZero, override: 'CORRECT' };
  }
  const results = final.results.map((r, i) => (i === action.index ? updated : r));
  return log({ ...state, final: { ...final, results } }, ctx, 'ANSWER_OVERRIDDEN', `Final answer ${action.index + 1} overridden`);
}

function finalRevealNext(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['FINAL_REVEAL']);
  const final = state.final!;
  if (final.revealedCount > final.completedCount) throw new EngineError('Previous reveal still running', 'REVEAL_RUNNING');
  if (final.revealedCount >= final.results.length) throw new EngineError('All answers revealed', 'ALL_REVEALED');
  const idx = final.revealedCount;
  const results = final.results.map((r, i) => (i === idx ? { ...r, revealStartedAt: ctx.now } : r));
  return log({ ...state, final: { ...final, results, revealedCount: idx + 1 } }, ctx, 'FINAL_REVEAL', `Revealing final answer ${idx + 1}`);
}

function finalRevealComplete(state: GameState, ctx: EngineContext): GameState {
  if (state.phase !== 'FINAL_REVEAL') return state;
  const final = state.final!;
  if (final.completedCount >= final.revealedCount) return state;
  const idx = final.completedCount;
  const result = final.results[idx];
  let next: GameState = { ...state, final: { ...final, completedCount: idx + 1 } };
  const promptId = result.promptId ?? (final.chosenCategoryId ? ctx.finalCategories[final.chosenCategoryId]?.prompts[0]?.id ?? null : null);
  if (promptId) next = { ...next, answerLog: [...next.answerLog, { at: ctx.now, stage: 'FINAL', roundIndex: state.roundIndex, passIndex: idx, teamId: final.teamId, questionId: promptId, playerName: '', text: result.text, matchedAnswerId: result.matchedAnswerId, canonical: result.canonical, score: result.score, correct: result.correct, isZero: result.isZero, overridden: result.override !== null }] };
  next = log(next, ctx, 'SCORE_REVEALED', `Final answer ${idx + 1}: ${result.correct ? result.canonical ?? result.text : 'incorrect'} → ${result.score}`);
  if (result.isZero) return finalConclude(next, 'WON', ctx);
  if (idx + 1 >= final.results.length) return finalConclude(next, 'LOST', ctx);
  return next;
}

function finalConclude(state: GameState, outcome: 'WON' | 'LOST', ctx: EngineContext): GameState {
  const final = state.final!;
  const result = calculateFinalResult(final.results.slice(0, final.completedCount), state.jackpot.amount, state.config.startingJackpot, state.config.failedFinalRollover);
  const won = outcome === 'WON';
  const jackpot = {
    ...state.jackpot,
    won,
    zeroCount: won ? state.jackpot.zeroCount + result.zeroCount : state.jackpot.zeroCount,
    nextGameAmount: won ? state.config.startingJackpot : state.jackpot.amount + state.config.failedFinalRollover,
    history: [...state.jackpot.history, won ? { at: ctx.now, delta: -state.jackpot.amount, reason: 'Jackpot won', amount: state.jackpot.amount } : { at: ctx.now, delta: state.config.failedFinalRollover, reason: 'Rolled over to next game', amount: state.jackpot.amount + state.config.failedFinalRollover }],
  };
  const next = setPhase({ ...state, final: { ...final, outcome }, jackpot }, won ? 'VICTORY' : 'DEFEAT', ctx);
  return log(next, ctx, won ? 'FINAL_WON' : 'FINAL_LOST', won ? `${teamById(state, final.teamId).name} win ${money(state, state.jackpot.amount)}` : `Jackpot rolls over to ${money(state, jackpot.nextGameAmount!)}`);
}

function finalFinish(state: GameState, ctx: EngineContext): GameState {
  expectPhase(state, ['VICTORY', 'DEFEAT']);
  return endGame(state, ctx);
}

function endGame(state: GameState, ctx: EngineContext): GameState {
  if (state.phase === 'GAME_OVER') return state;
  const jackpot = state.jackpot.nextGameAmount === null ? { ...state.jackpot, nextGameAmount: state.jackpot.amount } : state.jackpot;
  return log(setPhase({ ...state, jackpot, completedAt: ctx.now, timer: { kind: 'NONE', durationMs: 0, endsAt: null, remainingMs: 0, running: false } }, 'GAME_OVER', ctx), ctx, 'GAME_OVER', 'Game over');
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

function timerStart(state: GameState, kind: 'FINAL' | 'TEAM' | undefined, seconds: number | undefined, ctx: EngineContext): GameState {
  const k = kind ?? (state.phase.startsWith('FINAL') ? 'FINAL' : 'TEAM');
  const secs = seconds ?? (k === 'FINAL' ? state.config.finalDiscussionSeconds : state.config.teamAnswerSeconds || 30);
  const durationMs = Math.max(1, secs) * 1000;
  return { ...state, timer: { kind: k, durationMs, endsAt: ctx.now + durationMs, remainingMs: durationMs, running: true } };
}

function timerPause(state: GameState, ctx: EngineContext): GameState {
  const t = state.timer;
  if (!t.running || t.endsAt === null) return state;
  return { ...state, timer: { ...t, running: false, endsAt: null, remainingMs: Math.max(0, t.endsAt - ctx.now) } };
}

function timerResume(state: GameState, ctx: EngineContext): GameState {
  const t = state.timer;
  if (t.running || t.kind === 'NONE') return state;
  return { ...state, timer: { ...t, running: true, endsAt: ctx.now + t.remainingMs } };
}

function timerReset(state: GameState, _ctx: EngineContext): GameState {
  const t = state.timer;
  if (t.kind === 'NONE') return state;
  return { ...state, timer: { ...t, running: false, endsAt: null, remainingMs: t.durationMs } };
}

// ---------------------------------------------------------------------------
// ADVANCE: the host's "do the next sensible thing" button (SPACE)
// ---------------------------------------------------------------------------

function advance(state: GameState, ctx: EngineContext): GameState {
  switch (state.phase) {
    case 'LOBBY':
      return startGame(state, ctx);
    case 'INTRO':
      return setPhase(state, 'TEAM_INTRO', ctx, 'Team introduction');
    case 'TEAM_INTRO':
      return setPhase(state, 'ROUND_INTRO', ctx, `Round ${state.roundIndex + 1}`);
    case 'ROUND_INTRO':
      return startRound(state, ctx);
    case 'QUESTION_INTRO':
      return revealQuestion(state, ctx);
    case 'QUESTION_REVEALED': {
      const run = requireRun(state);
      const q = requireQuestion(ctx, run.questionId);
      if (!run.revealed.instructions && q.instructions) return revealInstructions(state, ctx);
      if (usesBoard(q.format) && !run.revealed.board) return revealBoard(state, ctx);
      return openAnswers(state, ctx);
    }
    case 'ACCEPTING_ANSWER':
      return lockAnswer(state, ctx);
    case 'ANSWER_LOCKED':
      return revealScore(state, ctx);
    case 'REVEALING_SCORE':
      return completeScoreReveal(state, ctx);
    case 'SCORE_REVEALED':
      return nextTeam(state, ctx);
    case 'PASS_RESULTS': {
      const run = requireRun(state);
      if (!run.resultsRevealed.low) return revealResults(state, 'low', ctx);
      if (!run.resultsRevealed.high) return revealResults(state, 'high', ctx);
      return endPass(state, ctx);
    }
    case 'ROUND_RESULTS': {
      const p = state.pendingElimination;
      if (p && p.tied.length) return setPhase(state, 'TIEBREAK_INTRO', ctx, 'Tie-break');
      if (p && p.eliminate.length) return eliminate(state, undefined, ctx);
      return nextRound(state, ctx);
    }
    case 'TIEBREAK_INTRO':
      throw new EngineError('Choose a tie-break question to continue', 'TIEBREAK_QUESTION_REQUIRED');
    case 'ELIMINATION':
      return nextRound(state, ctx);
    case 'HEAD_TO_HEAD_INTRO':
      return h2hNextQuestion(state, ctx);
    case 'HEAD_TO_HEAD_RESULT':
      return state.h2h?.winnerTeamId ? nextRound(state, ctx) : setPhase({ ...state, question: null }, 'HEAD_TO_HEAD_INTRO', ctx, `Head-to-Head question ${(state.h2h?.questionIndex ?? 0) + 1}`);
    case 'FINAL_INTRO':
      return setPhase(state, 'FINAL_CATEGORY_SELECTION', ctx, 'Final: category selection');
    case 'FINAL_CATEGORY_SELECTION':
      throw new EngineError('The team must choose a category', 'CATEGORY_REQUIRED');
    case 'FINAL_PROMPTS':
      return state.final?.promptsRevealed ? finalStartDiscussion(state, ctx) : finalRevealPrompts(state, ctx);
    case 'FINAL_DISCUSSION':
      return setPhase(timerPause(state, ctx), 'FINAL_SUBMISSION', ctx, 'Time up: submit final answers');
    case 'FINAL_SUBMISSION':
      return finalLockAnswers(state, ctx);
    case 'FINAL_REVEAL': {
      const f = state.final!;
      if (f.revealedCount > f.completedCount) return finalRevealComplete(state, ctx);
      return finalRevealNext(state, ctx);
    }
    case 'VICTORY':
    case 'DEFEAT':
      return endGame(state, ctx);
    case 'GAME_OVER':
      return state;
  }
}

// ---------------------------------------------------------------------------
// Debug / demo helpers (host-only, gated by the API layer)
// ---------------------------------------------------------------------------

function debugSkipToH2H(state: GameState, ctx: EngineContext): GameState {
  const idx = state.config.rounds.findIndex((r) => r.type === 'HEAD_TO_HEAD');
  if (idx < 0) throw new EngineError('No Head-to-Head round configured', 'NO_H2H_ROUND');
  const totals = calculateGameTotals(state.roundScores);
  const alive = activeTeams(state).sort((a, b) => (totals[a.id] ?? 0) - (totals[b.id] ?? 0));
  const keep = alive.slice(0, 2).map((t) => t.id);
  const teams: TeamState[] = state.teams.map((t) => (t.eliminatedRound === null && !keep.includes(t.id) ? { ...t, eliminatedRound: state.roundIndex } : t));
  const next: GameState = { ...state, teams, roundIndex: idx, passIndex: 0, question: null, pendingElimination: null, startedAt: state.startedAt ?? ctx.now, h2h: null };
  return enterHeadToHead(log(next, ctx, 'DEBUG', 'Skipped to Head-to-Head'), ctx);
}

function debugSkipToFinal(state: GameState, ctx: EngineContext): GameState {
  const idx = state.config.rounds.findIndex((r) => r.type === 'FINAL');
  if (idx < 0) throw new EngineError('No Final configured', 'NO_FINAL_ROUND');
  const totals = calculateGameTotals(state.roundScores);
  const alive = activeTeams(state).sort((a, b) => (totals[a.id] ?? 0) - (totals[b.id] ?? 0));
  const keep = alive[0]?.id;
  if (!keep) throw new EngineError('No team left', 'NO_TEAMS');
  const teams: TeamState[] = state.teams.map((t) => (t.eliminatedRound === null && t.id !== keep ? { ...t, eliminatedRound: state.roundIndex } : t));
  const next: GameState = { ...state, teams, roundIndex: idx, passIndex: 0, question: null, pendingElimination: null, startedAt: state.startedAt ?? ctx.now, final: null };
  return enterFinal(log(next, ctx, 'DEBUG', 'Skipped to the Final'), ctx);
}

function debugForceFinal(state: GameState, outcome: 'WON' | 'LOST', ctx: EngineContext): GameState {
  let s = state;
  if (!s.final) s = debugSkipToFinal(s, ctx);
  const final = s.final!;
  const count = s.config.finalAnswerCount;
  const results: FinalAnswerResult[] = Array.from({ length: count }, (_, i) => ({
    text: `Forced answer ${i + 1}`,
    promptId: null,
    matchedAnswerId: null,
    canonical: `Forced answer ${i + 1}`,
    score: outcome === 'WON' && i === count - 1 ? 0 : 100,
    correct: outcome === 'WON' && i === count - 1,
    isZero: outcome === 'WON' && i === count - 1,
    override: 'SCORE',
    revealStartedAt: ctx.now,
  }));
  const chosen = final.chosenCategoryId ?? final.categoryOptions[0]?.id ?? null;
  s = { ...s, final: { ...final, chosenCategoryId: chosen, promptsRevealed: true, answers: results.map((r) => ({ text: r.text, promptId: null })), results, revealedCount: count, completedCount: count } };
  s = setPhase(s, 'FINAL_REVEAL', ctx);
  return finalConclude(log(s, ctx, 'DEBUG', `Forced final ${outcome}`), outcome, ctx);
}
