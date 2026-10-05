/** Read-only derivations over GameState used by the host, display and controller views. */
import type { EngineContext, GameState, Phase, QuestionDef, QuestionRun, Submission } from './types';
import { submissionKey } from './types';
import { activeTeams, allTurnsRevealed, currentRound, currentSubmission, currentTurn, usesBoard } from './helpers';
import { calculateGameTotals, calculateRoundTotals, rankTeams } from '@/lib/scoring';

export interface LeaderboardRow {
  teamId: string;
  name: string;
  color: string;
  rank: number;
  passScore: number | null;
  roundTotal: number;
  gameTotal: number;
  eliminated: boolean;
  atRisk: boolean;
  tied: boolean;
  /** True once the team has at least one revealed score in the current round. */
  played: boolean;
}

export function leaderboard(state: GameState): LeaderboardRow[] {
  const roundScores = state.roundScores[state.roundIndex] ?? {};
  const roundTotals = calculateRoundTotals(roundScores);
  const gameTotals = calculateGameTotals(state.roundScores);
  const alive = activeTeams(state);
  const ranked = rankTeams(Object.fromEntries(alive.map((t) => [t.id, roundTotals[t.id] ?? 0])));
  const rankMap = Object.fromEntries(ranked.map((r) => [r.teamId, r.rank]));
  const worst = ranked.length > 1 ? Math.max(...ranked.map((r) => r.total)) : null;
  const pending = state.pendingElimination;
  const round = currentRound(state);
  const inElimination = round?.type === 'ELIMINATION';
  const rows: LeaderboardRow[] = alive.map((t) => {
    const roundTotal = roundTotals[t.id] ?? 0;
    const passScore = roundScores[t.id]?.[state.passIndex] ?? null;
    return {
      teamId: t.id,
      name: t.name,
      color: t.color,
      rank: rankMap[t.id] ?? 0,
      passScore,
      roundTotal,
      gameTotal: gameTotals[t.id] ?? 0,
      eliminated: false,
      atRisk: pending ? pending.eliminate.includes(t.id) : inElimination && worst !== null && roundTotal === worst && Object.values(roundScores).some((p) => p.some((s) => s !== null)),
      tied: pending ? pending.tied.includes(t.id) : false,
      played: (roundScores[t.id] ?? []).some((s) => s !== null),
    };
  });
  rows.sort((a, b) => a.roundTotal - b.roundTotal || a.gameTotal - b.gameTotal || a.name.localeCompare(b.name));
  const out = [...rows];
  for (const t of state.teams.filter((x) => x.eliminatedRound !== null).sort((a, b) => (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0))) {
    out.push({ teamId: t.id, name: t.name, color: t.color, rank: 0, passScore: null, roundTotal: calculateRoundTotals(state.roundScores[t.eliminatedRound ?? 0] ?? {})[t.id] ?? 0, gameTotal: gameTotals[t.id] ?? 0, eliminated: true, atRisk: false, tied: false, played: true });
  }
  return out;
}

export interface PassResultRow {
  canonical: string;
  score: number;
  givenBy: string[];
}

/** Most common / rarest correct answers for the current question pool. */
export function passResults(state: GameState, q: QuestionDef, poolIndex = 0, limit = 5): { high: PassResultRow[]; low: PassResultRow[] } {
  const run = state.question;
  const correct = q.answers.filter((a) => a.correct && a.poolIndex === poolIndex);
  const givenBy = (answerId: string) => {
    if (!run) return [];
    return Object.values(run.submissions).filter((s) => s.revealed && s.matchedAnswerId === answerId).map((s) => state.teams.find((t) => t.id === s.teamId)?.name ?? '');
  };
  const rows = correct.map((a) => ({ canonical: a.canonical, score: a.score, givenBy: givenBy(a.id) }));
  const high = [...rows].sort((a, b) => b.score - a.score || a.canonical.localeCompare(b.canonical)).slice(0, limit);
  const low = [...rows].sort((a, b) => a.score - b.score || a.canonical.localeCompare(b.canonical)).slice(0, limit);
  return { high, low };
}

export interface NextStep {
  action: string;
  label: string;
  /** false when the host must choose something (e.g. tie-break question). */
  enabled: boolean;
  hint?: string;
}

export function nextStep(state: GameState, ctx: Pick<EngineContext, 'questions'>): NextStep {
  const run = state.question;
  const q = run ? ctx.questions[run.questionId] : null;
  switch (state.phase) {
    case 'LOBBY':
      return { action: 'START_GAME', label: 'Start game', enabled: state.teams.length >= 2, hint: state.teams.length < 2 ? 'Add at least two teams' : undefined };
    case 'INTRO':
      return { action: 'ADVANCE', label: 'Introduce teams', enabled: true };
    case 'TEAM_INTRO':
      return { action: 'ADVANCE', label: `Round ${state.roundIndex + 1} intro`, enabled: true };
    case 'ROUND_INTRO':
      return { action: 'ADVANCE', label: 'Show category', enabled: true };
    case 'QUESTION_INTRO':
      return { action: 'ADVANCE', label: 'Reveal question', enabled: true };
    case 'QUESTION_REVEALED':
      if (run && q && !run.revealed.instructions && q.instructions) return { action: 'ADVANCE', label: 'Show acceptance rules', enabled: true };
      if (run && q && usesBoard(q.format) && !run.revealed.board) return { action: 'ADVANCE', label: 'Reveal board', enabled: true };
      return { action: 'ADVANCE', label: 'Open answers', enabled: true };
    case 'ACCEPTING_ANSWER': {
      const sub = currentSubmission(run);
      const has = !!sub && (!!sub.text || (!!sub.boardItemId && q?.format === 'BOARD'));
      return { action: 'LOCK_ANSWER', label: 'Lock answer', enabled: has, hint: has ? undefined : 'Waiting for an answer' };
    }
    case 'ANSWER_LOCKED':
      return { action: 'REVEAL_SCORE', label: 'Reveal score', enabled: true };
    case 'REVEALING_SCORE':
      return { action: 'ADVANCE', label: 'Skip animation', enabled: true };
    case 'SCORE_REVEALED':
      return run && allTurnsRevealed(run) ? { action: 'ADVANCE', label: run.stage === 'HEAD_TO_HEAD' ? 'Award point' : 'Pass results', enabled: true } : { action: 'NEXT_TEAM', label: 'Next team', enabled: true };
    case 'PASS_RESULTS':
      if (run && !run.resultsRevealed.low) return { action: 'REVEAL_LOW_ANSWERS', label: 'Reveal rarest answers', enabled: true };
      if (run && !run.resultsRevealed.high) return { action: 'REVEAL_HIGH_ANSWERS', label: 'Reveal most common', enabled: true };
      {
        const round = currentRound(state);
        const more = run && round && run.stage === 'ELIMINATION' && run.passIndex + 1 < round.passes;
        return { action: 'END_PASS', label: more ? `Start pass ${run!.passIndex + 2}` : 'Show leaderboard', enabled: true };
      }
    case 'ROUND_RESULTS': {
      const p = state.pendingElimination;
      if (p?.tied.length) return { action: 'ADVANCE', label: 'Tie-break', enabled: true };
      if (p?.eliminate.length) return { action: 'ELIMINATE', label: 'Eliminate team', enabled: true };
      return { action: 'NEXT_ROUND', label: 'Next round', enabled: true };
    }
    case 'TIEBREAK_INTRO':
      return { action: 'START_TIEBREAK', label: 'Start tie-break', enabled: false, hint: 'Pick a tie-break question' };
    case 'ELIMINATION': {
      const next = state.config.rounds[state.roundIndex + 1];
      return { action: 'NEXT_ROUND', label: next?.type === 'HEAD_TO_HEAD' ? 'Head-to-Head' : next?.type === 'FINAL' ? 'The Final' : 'Next round', enabled: true };
    }
    case 'HEAD_TO_HEAD_INTRO':
      return { action: 'H2H_NEXT_QUESTION', label: `Question ${(state.h2h?.questionIndex ?? 0) + 1}`, enabled: !!state.h2h?.firstTeamId, hint: state.h2h?.firstTeamId ? undefined : 'Decide who answers first' };
    case 'HEAD_TO_HEAD_RESULT':
      return { action: 'ADVANCE', label: state.h2h?.winnerTeamId ? 'To the Final' : 'Next question', enabled: true };
    case 'FINAL_INTRO':
      return { action: 'ADVANCE', label: 'Show categories', enabled: true };
    case 'FINAL_CATEGORY_SELECTION':
      return { action: 'FINAL_SELECT_CATEGORY', label: 'Waiting for category', enabled: false, hint: 'Team picks a category (or choose for them)' };
    case 'FINAL_PROMPTS':
      return state.final?.promptsRevealed ? { action: 'FINAL_START_DISCUSSION', label: `Start ${state.config.finalDiscussionSeconds}s timer`, enabled: true } : { action: 'FINAL_REVEAL_PROMPTS', label: 'Reveal prompts', enabled: true };
    case 'FINAL_DISCUSSION':
      return { action: 'ADVANCE', label: 'Time up: collect answers', enabled: true };
    case 'FINAL_SUBMISSION':
      return { action: 'FINAL_LOCK_ANSWERS', label: 'Lock final answers', enabled: (state.final?.answers.filter((a) => a.text).length ?? 0) > 0, hint: 'Enter the three answers' };
    case 'FINAL_REVEAL': {
      const f = state.final!;
      if (f.revealedCount > f.completedCount) return { action: 'ADVANCE', label: 'Skip animation', enabled: true };
      return { action: 'FINAL_REVEAL_NEXT', label: `Reveal answer ${f.revealedCount + 1}`, enabled: f.revealedCount < f.results.length };
    }
    case 'VICTORY':
    case 'DEFEAT':
      return { action: 'END_GAME', label: 'End game', enabled: true };
    case 'GAME_OVER':
      return { action: 'NONE', label: 'Game over', enabled: false };
  }
}

export const PHASE_LABELS: Record<Phase, string> = {
  LOBBY: 'Lobby',
  INTRO: 'Intro',
  TEAM_INTRO: 'Team introduction',
  ROUND_INTRO: 'Round intro',
  QUESTION_INTRO: 'Category',
  QUESTION_REVEALED: 'Question',
  ACCEPTING_ANSWER: 'Accepting answer',
  ANSWER_LOCKED: 'Answer locked',
  REVEALING_SCORE: 'Revealing score',
  SCORE_REVEALED: 'Score revealed',
  PASS_RESULTS: 'Pass results',
  ROUND_RESULTS: 'Leaderboard',
  ELIMINATION: 'Elimination',
  TIEBREAK_INTRO: 'Tie-break',
  HEAD_TO_HEAD_INTRO: 'Head-to-Head',
  HEAD_TO_HEAD_RESULT: 'Head-to-Head point',
  FINAL_INTRO: 'The Final',
  FINAL_CATEGORY_SELECTION: 'Final: categories',
  FINAL_PROMPTS: 'Final: prompts',
  FINAL_DISCUSSION: 'Final: discussion',
  FINAL_SUBMISSION: 'Final: answers',
  FINAL_REVEAL: 'Final: reveal',
  VICTORY: 'Jackpot won',
  DEFEAT: 'Jackpot lost',
  GAME_OVER: 'Game over',
};

export function stageTitle(state: GameState): string {
  const round = currentRound(state);
  const run = state.question;
  if (run?.stage === 'TIEBREAK') return `Tie-break ${run.tiebreakNumber}`;
  if (round?.type === 'HEAD_TO_HEAD' || state.phase.startsWith('HEAD_TO_HEAD')) return 'Head-to-Head';
  if (round?.type === 'FINAL' || state.phase.startsWith('FINAL') || state.phase === 'VICTORY' || state.phase === 'DEFEAT') return 'The Final';
  if (round?.type === 'ELIMINATION') return round.passes > 1 && run ? `Round ${state.roundIndex + 1} · Pass ${run.passIndex + 1}` : `Round ${state.roundIndex + 1}`;
  return '';
}

export function currentTeamId(state: GameState): string | null {
  return currentTurn(state.question)?.teamId ?? null;
}

export function submissionFor(run: QuestionRun | null, teamId: string, poolIndex: number): Submission | null {
  return run?.submissions[submissionKey(teamId, poolIndex)] ?? null;
}

/** Duration (ms) of the reveal animation for a score; lower scores run longer for tension. */
export function revealDurationMs(score: number, animations = true): number {
  if (!animations) return 400;
  if (score >= 100) return 1800;
  if (score >= 60) return 2400;
  if (score >= 30) return 3200;
  if (score >= 10) return 4000;
  if (score > 0) return 4800;
  return 5600;
}
