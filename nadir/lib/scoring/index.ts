/**
 * Pure scoring functions. No state, no IO. Every rule of the game that involves a number
 * is expressed here and covered by tests/unit/scoring.test.ts.
 */
import type { AnswerDef, FinalAnswerResult, LinkedScoring } from '@/lib/game-engine/types';
import { matchAnswer, type MatchResult } from '@/lib/matching/match';

export interface ScoredAnswer {
  score: number;
  correct: boolean;
  isZero: boolean;
  matchedAnswerId: string | null;
  canonical: string | null;
  confidence: MatchResult['confidence'] | null;
}

/**
 * Scores a typed answer against an answer pool.
 * - a match on a correct answer scores its survey score
 * - a match on a listed incorrect answer, or no match at all, scores `incorrectScore` (default 100)
 */
export function scoreAnswer(input: string, answers: AnswerDef[], incorrectScore = 100): ScoredAnswer {
  const match = matchAnswer(input, answers);
  if (!match || !match.answer.correct) {
    return { score: incorrectScore, correct: false, isZero: false, matchedAnswerId: match?.answer.id ?? null, canonical: match?.answer.canonical ?? null, confidence: match?.confidence ?? null };
  }
  const score = clampScore(match.answer.score);
  return { score, correct: true, isZero: score === 0, matchedAnswerId: match.answer.id, canonical: match.answer.canonical, confidence: match.confidence };
}

/** Scores a board selection: the chosen card either carries a correct answer or is a decoy. */
export function scoreBoardSelection(boardItemId: string, answers: AnswerDef[], incorrectScore = 100): ScoredAnswer {
  const answer = answers.find((a) => a.boardItemId === boardItemId && a.correct);
  if (!answer) return { score: incorrectScore, correct: false, isZero: false, matchedAnswerId: null, canonical: null, confidence: null };
  const score = clampScore(answer.score);
  return { score, correct: true, isZero: score === 0, matchedAnswerId: answer.id, canonical: answer.canonical, confidence: 'EXACT' };
}

/** Builds the scored result for an explicit answer (host override "choose canonical"). */
export function scoreFromAnswerDef(answer: AnswerDef, incorrectScore = 100): ScoredAnswer {
  if (!answer.correct) return { score: incorrectScore, correct: false, isZero: false, matchedAnswerId: answer.id, canonical: answer.canonical, confidence: 'EXACT' };
  const score = clampScore(answer.score);
  return { score, correct: true, isZero: score === 0, matchedAnswerId: answer.id, canonical: answer.canonical, confidence: 'EXACT' };
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Combines the two halves of a LINKED-category pass. */
export function combineLinkedScores(a: number, b: number, rule: LinkedScoring = 'SUM'): number {
  switch (rule) {
    case 'MAX':
      return Math.max(a, b);
    case 'MIN':
      return Math.min(a, b);
    default:
      return a + b;
  }
}

/** Sum of a team's passes in a round (missing passes count as 0). */
export function calculateRoundTotals(scores: Record<string, (number | null)[]>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const [teamId, passes] of Object.entries(scores)) {
    totals[teamId] = passes.reduce<number>((sum, s) => sum + (s ?? 0), 0);
  }
  return totals;
}

/** Sum of a team's totals across every elimination round played. */
export function calculateGameTotals(rounds: Record<number, Record<string, (number | null)[]>>): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const scores of Object.values(rounds)) {
    for (const [teamId, total] of Object.entries(calculateRoundTotals(scores))) {
      totals[teamId] = (totals[teamId] ?? 0) + total;
    }
  }
  return totals;
}

export interface EliminationResult {
  /** Teams definitely eliminated (strictly worse than everyone else surviving). */
  eliminate: string[];
  /** Teams tied for the remaining elimination slot(s); a tie-break is required when non-empty. */
  tied: string[];
  /** How many of the tied teams must still be eliminated. */
  slots: number;
}

/**
 * Highest total is eliminated. If several teams share the boundary score they are returned
 * as `tied` and the caller must run a tie-break among them.
 */
export function getEliminatedTeams(totals: Record<string, number>, count = 1): EliminationResult {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (count <= 0 || entries.length <= count) return { eliminate: [], tied: [], slots: 0 };
  const boundaryScore = entries[count - 1][1];
  const above = entries.filter(([, s]) => s > boundaryScore).map(([id]) => id);
  const atBoundary = entries.filter(([, s]) => s === boundaryScore).map(([id]) => id);
  const slots = count - above.length;
  if (atBoundary.length === slots) return { eliminate: [...above, ...atBoundary], tied: [], slots: 0 };
  return { eliminate: above, tied: atBoundary, slots };
}

/** Convenience: single team to eliminate or null when tied. */
export function getEliminatedTeam(totals: Record<string, number>): string | null {
  const r = getEliminatedTeams(totals, 1);
  return r.tied.length ? null : r.eliminate[0] ?? null;
}

/**
 * Resolves a tie-break question: tied teams' tie-break scores, highest loses.
 * Returns the same shape as getEliminatedTeams restricted to the tied teams.
 */
export function resolveTie(tiebreakScores: Record<string, number>, slots = 1): EliminationResult {
  return getEliminatedTeams(tiebreakScores, slots);
}

/** Jackpot after a zero answer achieved before the Final. */
export function applyJackpotIncrease(amount: number, bonus: number): number {
  return amount + bonus;
}

/** Lower score wins; equal scores → null (no point) unless the caller runs sudden death. */
export function resolveHeadToHeadQuestion(scores: Record<string, number>): string | null {
  const entries = Object.entries(scores);
  if (entries.length < 2) return null;
  entries.sort((a, b) => a[1] - b[1]);
  if (entries[0][1] === entries[1][1]) return null;
  return entries[0][0];
}

export function headToHeadTarget(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

export function headToHeadWinner(points: Record<string, number>, bestOf: number): string | null {
  const target = headToHeadTarget(bestOf);
  for (const [teamId, p] of Object.entries(points)) if (p >= target) return teamId;
  return null;
}

export interface FinalOutcome {
  won: boolean;
  zeroCount: number;
  /** Jackpot the team takes home (0 when lost). */
  payout: number;
  /** Jackpot the next game should start with. */
  nextJackpot: number;
}

/**
 * Any zero among the final answers wins the whole jackpot; the next game resets to the
 * starting jackpot. Otherwise the jackpot rolls over plus the failed-final bonus.
 */
export function calculateFinalResult(
  results: Pick<FinalAnswerResult, 'score' | 'correct'>[],
  jackpot: number,
  startingJackpot: number,
  rollover: number,
): FinalOutcome {
  const zeroCount = results.filter((r) => r.correct && r.score === 0).length;
  const won = zeroCount > 0;
  return { won, zeroCount, payout: won ? jackpot : 0, nextJackpot: won ? startingJackpot : jackpot + rollover };
}

/** Ordered leaderboard rows: lower is better. */
export function rankTeams(totals: Record<string, number>): { teamId: string; total: number; rank: number }[] {
  const rows = Object.entries(totals).map(([teamId, total]) => ({ teamId, total, rank: 0 })).sort((a, b) => a.total - b.total);
  let rank = 0;
  let last: number | null = null;
  rows.forEach((row, i) => {
    if (last === null || row.total !== last) rank = i + 1;
    row.rank = rank;
    last = row.total;
  });
  return rows;
}
