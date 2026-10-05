/**
 * Role-scoped projections of GameState. The authoritative state (with every survey score)
 * never leaves the server; each role receives only what it is allowed to see right now.
 */
import type { BoardItemDef, EngineContext, FinalAnswerResult, GameState, QuestionDef, Submission } from './types';
import { currentTurn, usesBoard } from './helpers';
import { leaderboard, nextStep, passResults, stageTitle, type LeaderboardRow, type NextStep, type PassResultRow } from './selectors';

export interface PublicBoardItem extends Omit<BoardItemDef, 'decoy'> {
  used: boolean;
}

export interface PublicQuestion {
  id: string;
  category: string;
  text: string | null;
  instructions: string | null;
  format: QuestionDef['format'];
  settings: QuestionDef['settings'];
  boardItems: PublicBoardItem[] | null;
  mediaUrl: string | null;
}

export interface PublicSubmission {
  teamId: string;
  teamName: string;
  poolIndex: number;
  playerName: string;
  text: string;
  boardItemId: string | null;
  boardLabel: string | null;
  locked: boolean;
  revealed: boolean;
  revealing: boolean;
  revealStartedAt: number | null;
  /** Only present once the reveal has started. */
  score: number | null;
  correct: boolean | null;
  canonical: string | null;
  isZero: boolean;
}

export interface PublicFinalResult {
  text: string;
  revealStartedAt: number | null;
  revealed: boolean;
  completed: boolean;
  score: number | null;
  correct: boolean | null;
  canonical: string | null;
  isZero: boolean;
  promptText: string | null;
}

export interface PublicFinal {
  teamId: string;
  categoryOptions: { id: string; title: string }[];
  chosenCategoryId: string | null;
  promptsRevealed: boolean;
  revealedCount: number;
  completedCount: number;
  outcome: 'WON' | 'LOST' | null;
  jackpotAtStake: number;
  results: PublicFinalResult[];
  answerCount: number;
  categoryTitle: string | null;
  prompts: { id: string; text: string }[] | null;
}

export interface DisplayView {
  role: 'display';
  id: string;
  name: string;
  roomCode: string;
  phase: GameState['phase'];
  previousPhase: GameState['phase'] | null;
  stageTitle: string;
  config: Pick<GameState['config'], 'currency' | 'zeroTerm' | 'animations' | 'sound' | 'prize' | 'finalAnswerCount' | 'finalDiscussionSeconds' | 'incorrectScore'>;
  teams: GameState['teams'];
  roundIndex: number;
  passIndex: number;
  roundCount: number;
  question: PublicQuestion | null;
  stage: GameState['question'] extends null ? null : string | null;
  currentTeamId: string | null;
  currentPoolIndex: number | null;
  turnOrder: string[];
  submissions: PublicSubmission[];
  currentSubmission: PublicSubmission | null;
  results: { low: PassResultRow[] | null; high: PassResultRow[] | null };
  leaderboard: LeaderboardRow[];
  pendingElimination: GameState['pendingElimination'];
  eliminations: GameState['eliminations'];
  h2h: GameState['h2h'];
  final: PublicFinal | null;
  timer: GameState['timer'];
  jackpot: GameState['jackpot'];
  winnerTeamId: string | null;
  serverNow: number;
  version: number;
}

export interface HostView extends Omit<DisplayView, 'role' | 'question' | 'submissions' | 'currentSubmission' | 'final'> {
  role: 'host';
  question: (PublicQuestion & { answers: QuestionDef['answers']; text: string; instructions: string; explanation: string }) | null;
  submissions: (PublicSubmission & { score: number; correct: boolean; matchedAnswerId: string | null; override: Submission['override'] })[];
  currentSubmission: (PublicSubmission & { score: number; correct: boolean; matchedAnswerId: string | null; override: Submission['override'] }) | null;
  final: (PublicFinal & { fullResults: FinalAnswerResult[]; promptDetails: QuestionDef[] | null }) | null;
  next: NextStep;
  log: GameState['log'];
  forcedScore: number | null;
  fullConfig: GameState['config'];
  tiebreakQuestionsUsed: string[];
  phaseResults: { low: PassResultRow[]; high: PassResultRow[] } | null;
}

export interface TeamView {
  role: 'team';
  id: string;
  name: string;
  roomCode: string;
  phase: GameState['phase'];
  stageTitle: string;
  team: GameState['teams'][number];
  teams: { id: string; name: string; color: string; eliminated: boolean }[];
  isMyTurn: boolean;
  currentTeamName: string | null;
  currentPoolIndex: number | null;
  poolLabel: string | null;
  question: PublicQuestion | null;
  mySubmission: { text: string; boardItemId: string | null; locked: boolean; revealed: boolean; score: number | null; correct: boolean | null; canonical: string | null; isZero: boolean } | null;
  myRoundTotal: number;
  myRank: number | null;
  eliminated: boolean;
  h2h: { points: Record<string, number>; bestOf: number; opponentName: string } | null;
  final: { isFinalist: boolean; categoryOptions: { id: string; title: string }[]; chosenCategoryId: string | null; categoryTitle: string | null; prompts: { id: string; text: string }[] | null; answers: { text: string; promptId: string | null }[]; locked: boolean; results: PublicFinalResult[]; outcome: 'WON' | 'LOST' | null; answerCount: number; promptsRevealed: boolean } | null;
  timer: GameState['timer'];
  jackpot: { amount: number; currency: string };
  config: { zeroTerm: string; finalAnswerMode: GameState['config']['finalAnswerMode'] };
  serverNow: number;
  version: number;
}

function publicQuestion(state: GameState, q: QuestionDef): PublicQuestion {
  const run = state.question!;
  const showBoard = run.revealed.board || state.phase === 'ACCEPTING_ANSWER' || (usesBoard(q.format) && ['ANSWER_LOCKED', 'REVEALING_SCORE', 'SCORE_REVEALED', 'PASS_RESULTS'].includes(state.phase));
  return {
    id: q.id,
    category: q.category,
    text: run.revealed.question ? q.text : null,
    instructions: run.revealed.instructions ? q.instructions : null,
    format: q.format,
    settings: q.settings,
    boardItems: showBoard ? [...q.boardItems].sort((a, b) => a.sortOrder - b.sortOrder).map(({ decoy: _decoy, ...b }) => ({ ...b, used: run.usedBoardItemIds.includes(b.id) })) : null,
    mediaUrl: run.revealed.question ? q.mediaUrl ?? null : null,
  };
}

function publicSubmission(state: GameState, s: Submission, q: QuestionDef | null): PublicSubmission {
  const revealing = state.phase === 'REVEALING_SCORE' && !s.revealed && s.revealStartedAt !== null;
  const visible = s.revealed || revealing;
  const item = s.boardItemId && q ? q.boardItems.find((b) => b.id === s.boardItemId) : null;
  return {
    teamId: s.teamId,
    teamName: state.teams.find((t) => t.id === s.teamId)?.name ?? '',
    poolIndex: s.poolIndex,
    playerName: s.playerName,
    text: s.locked ? s.text : s.text ? '•••' : '',
    boardItemId: s.locked ? s.boardItemId : null,
    boardLabel: s.locked && item ? item.label || item.clue : null,
    locked: s.locked,
    revealed: s.revealed,
    revealing,
    revealStartedAt: visible ? s.revealStartedAt : null,
    score: visible ? s.score : null,
    correct: visible ? s.correct : null,
    canonical: visible ? s.canonical : null,
    isZero: visible ? s.isZero : false,
  };
}

function publicFinal(state: GameState, ctx: EngineContext, includeCategoryPrompts: boolean): PublicFinal | null {
  const f = state.final;
  if (!f) return null;
  const cat = f.chosenCategoryId ? ctx.finalCategories[f.chosenCategoryId] : null;
  const prompts = cat && (f.promptsRevealed || includeCategoryPrompts) ? cat.prompts.map((p) => ({ id: p.id, text: p.text })) : null;
  const results: PublicFinalResult[] = f.results.map((r, i) => {
    const revealed = i < f.revealedCount;
    const completed = i < f.completedCount;
    return {
      text: revealed ? r.text : '',
      revealStartedAt: revealed ? r.revealStartedAt : null,
      revealed,
      completed,
      score: revealed ? r.score : null,
      correct: revealed ? r.correct : null,
      canonical: revealed ? r.canonical : null,
      isZero: revealed ? r.isZero : false,
      promptText: revealed ? cat?.prompts.find((p) => p.id === r.promptId)?.text ?? null : null,
    };
  });
  return { teamId: f.teamId, categoryOptions: f.categoryOptions, chosenCategoryId: f.chosenCategoryId, promptsRevealed: f.promptsRevealed, revealedCount: f.revealedCount, completedCount: f.completedCount, outcome: f.outcome, jackpotAtStake: f.jackpotAtStake, results, answerCount: f.answers.filter((a) => a.text).length, categoryTitle: cat?.title ?? null, prompts };
}

export function projectDisplay(state: GameState, ctx: EngineContext): DisplayView {
  const run = state.question;
  const q = run ? ctx.questions[run.questionId] ?? null : null;
  const turn = currentTurn(run);
  const subs = run && q ? Object.values(run.submissions).map((s) => publicSubmission(state, s, q)) : [];
  const cur = turn ? subs.find((s) => s.teamId === turn.teamId && s.poolIndex === turn.poolIndex) ?? null : null;
  const res = run && q && state.phase === 'PASS_RESULTS' ? passResults(state, q, 0) : null;
  const final = publicFinal(state, ctx, false);
  return {
    role: 'display',
    id: state.id,
    name: state.name,
    roomCode: state.roomCode,
    phase: state.phase,
    previousPhase: state.previousPhase,
    stageTitle: stageTitle(state),
    config: { currency: state.config.currency, zeroTerm: state.config.zeroTerm, animations: state.config.animations, sound: state.config.sound, prize: state.config.prize, finalAnswerCount: state.config.finalAnswerCount, finalDiscussionSeconds: state.config.finalDiscussionSeconds, incorrectScore: state.config.incorrectScore },
    teams: state.teams,
    roundIndex: state.roundIndex,
    passIndex: state.passIndex,
    roundCount: state.config.rounds.length,
    question: run && q ? publicQuestion(state, q) : null,
    stage: run?.stage ?? null,
    currentTeamId: turn?.teamId ?? null,
    currentPoolIndex: turn?.poolIndex ?? null,
    turnOrder: run ? [...new Set(run.turns.map((t) => t.teamId))] : [],
    submissions: subs,
    currentSubmission: cur,
    results: { low: res && run!.resultsRevealed.low ? res.low : null, high: res && run!.resultsRevealed.high ? res.high : null },
    leaderboard: leaderboard(state),
    pendingElimination: state.phase === 'ROUND_RESULTS' || state.phase === 'ELIMINATION' || state.phase === 'TIEBREAK_INTRO' ? state.pendingElimination : null,
    eliminations: state.eliminations,
    h2h: state.h2h,
    final,
    timer: state.timer,
    jackpot: state.jackpot,
    winnerTeamId: state.winnerTeamId,
    serverNow: ctx.now,
    version: state.version,
  };
}

export function projectHost(state: GameState, ctx: EngineContext): HostView {
  const base = projectDisplay(state, ctx);
  const run = state.question;
  const q = run ? ctx.questions[run.questionId] ?? null : null;
  const turn = currentTurn(run);
  const subs = run && q ? Object.values(run.submissions).map((s) => ({ ...publicSubmission(state, s, q), text: s.text, boardItemId: s.boardItemId, boardLabel: s.boardItemId ? q.boardItems.find((b) => b.id === s.boardItemId)?.label ?? null : null, score: s.score, correct: s.correct, matchedAnswerId: s.matchedAnswerId, override: s.override, canonical: s.canonical, isZero: s.isZero })) : [];
  const cur = turn ? subs.find((s) => s.teamId === turn.teamId && s.poolIndex === turn.poolIndex) ?? null : null;
  const f = publicFinal(state, ctx, true);
  const cat = state.final?.chosenCategoryId ? ctx.finalCategories[state.final.chosenCategoryId] : null;
  return {
    ...base,
    role: 'host',
    question: run && q ? { ...publicQuestion(state, q), text: q.text, instructions: q.instructions, explanation: q.explanation, answers: q.answers, boardItems: [...q.boardItems].sort((a, b) => a.sortOrder - b.sortOrder).map(({ decoy: _d, ...b }) => ({ ...b, used: run.usedBoardItemIds.includes(b.id) })) } : null,
    submissions: subs,
    currentSubmission: cur,
    final: f ? { ...f, fullResults: state.final!.results, promptDetails: cat?.prompts ?? null } : null,
    next: nextStep(state, ctx),
    log: state.log.slice(-40),
    forcedScore: state.forcedScore,
    fullConfig: state.config,
    tiebreakQuestionsUsed: state.tiebreakQuestionsUsed,
    phaseResults: run && q ? passResults(state, q, 0) : null,
  };
}

export function projectTeam(state: GameState, ctx: EngineContext, teamId: string): TeamView {
  const team = state.teams.find((t) => t.id === teamId);
  if (!team) throw new Error('Unknown team');
  const run = state.question;
  const q = run ? ctx.questions[run.questionId] ?? null : null;
  const turn = currentTurn(run);
  const isMyTurn = state.phase === 'ACCEPTING_ANSWER' && turn?.teamId === teamId;
  const mine = turn && run ? run.submissions[`${teamId}:${turn.poolIndex}`] ?? null : null;
  const rows = leaderboard(state);
  const myRow = rows.find((r) => r.teamId === teamId);
  const pub = run && q ? publicQuestion(state, q) : null;
  const f = state.final;
  const cat = f?.chosenCategoryId ? ctx.finalCategories[f.chosenCategoryId] : null;
  const pf = publicFinal(state, ctx, false);
  const participating = !run || run.participantTeamIds.includes(teamId);
  return {
    role: 'team',
    id: state.id,
    name: state.name,
    roomCode: state.roomCode,
    phase: state.phase,
    stageTitle: stageTitle(state),
    team,
    teams: state.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, eliminated: t.eliminatedRound !== null })),
    isMyTurn,
    currentTeamName: turn ? state.teams.find((t) => t.id === turn.teamId)?.name ?? null : null,
    currentPoolIndex: turn?.poolIndex ?? null,
    poolLabel: q?.format === 'LINKED' && turn ? q.settings.poolLabels?.[turn.poolIndex] ?? null : null,
    question: pub && participating ? pub : pub ? { ...pub, boardItems: pub.boardItems } : null,
    mySubmission: mine ? { text: mine.text, boardItemId: mine.boardItemId, locked: mine.locked, revealed: mine.revealed, score: mine.revealed ? mine.score : null, correct: mine.revealed ? mine.correct : null, canonical: mine.revealed ? mine.canonical : null, isZero: mine.revealed && mine.isZero } : null,
    myRoundTotal: myRow?.roundTotal ?? 0,
    myRank: myRow && !myRow.eliminated ? myRow.rank : null,
    eliminated: team.eliminatedRound !== null,
    h2h: state.h2h && state.h2h.teamIds.includes(teamId) ? { points: state.h2h.points, bestOf: state.h2h.bestOf, opponentName: state.teams.find((t) => t.id === state.h2h!.teamIds.find((id) => id !== teamId))?.name ?? '' } : null,
    final: f ? { isFinalist: f.teamId === teamId, categoryOptions: f.categoryOptions, chosenCategoryId: f.chosenCategoryId, categoryTitle: cat?.title ?? null, prompts: f.promptsRevealed && cat ? cat.prompts.map((p) => ({ id: p.id, text: p.text })) : null, answers: f.answers, locked: f.results.length > 0, results: pf?.results ?? [], outcome: f.outcome, answerCount: state.config.finalAnswerCount, promptsRevealed: f.promptsRevealed } : null,
    timer: state.timer,
    jackpot: { amount: state.jackpot.amount, currency: state.config.currency },
    config: { zeroTerm: state.config.zeroTerm, finalAnswerMode: state.config.finalAnswerMode },
    serverNow: ctx.now,
    version: state.version,
  };
}
