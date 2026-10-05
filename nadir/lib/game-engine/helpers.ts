import type { GameState, QuestionDef, QuestionRun, RoundPlan, Submission, TeamState, Turn } from './types';
import { submissionKey } from './types';

export function activeTeams(state: GameState): TeamState[] {
  return state.teams.filter((t) => t.eliminatedRound === null);
}

export function teamById(state: GameState, teamId: string): TeamState {
  const t = state.teams.find((x) => x.id === teamId);
  if (!t) throw new Error(`Unknown team ${teamId}`);
  return t;
}

export function currentRound(state: GameState): RoundPlan | null {
  return state.config.rounds[state.roundIndex] ?? null;
}

export function currentTurn(run: QuestionRun | null): Turn | null {
  if (!run) return null;
  return run.turns[run.turnIndex] ?? null;
}

export function currentSubmission(run: QuestionRun | null): Submission | null {
  const turn = currentTurn(run);
  if (!run || !turn) return null;
  return run.submissions[submissionKey(turn.teamId, turn.poolIndex)] ?? null;
}

export function poolAnswers(q: QuestionDef, poolIndex: number) {
  return q.answers.filter((a) => a.poolIndex === poolIndex);
}

export function usesBoard(format: QuestionDef['format']): boolean {
  return format === 'BOARD' || format === 'CLUES' || format === 'PICTURE' || format === 'PARTIAL';
}

export function requiresTypedAnswer(format: QuestionDef['format']): boolean {
  return format !== 'BOARD';
}

export function requiresBoardSelection(format: QuestionDef['format']): boolean {
  return usesBoard(format);
}

/** Submissions for a team in the current run, ordered by pool. */
export function teamSubmissions(run: QuestionRun, teamId: string): Submission[] {
  return Object.values(run.submissions).filter((s) => s.teamId === teamId).sort((a, b) => a.poolIndex - b.poolIndex);
}

export function allTurnsRevealed(run: QuestionRun): boolean {
  return run.turns.every((t) => run.submissions[submissionKey(t.teamId, t.poolIndex)]?.revealed);
}

/** Rotates the default order so the same team does not always open a pass. */
export function defaultTurnOrder(teamIds: string[], rotateBy: number): string[] {
  if (teamIds.length === 0) return [];
  const r = ((rotateBy % teamIds.length) + teamIds.length) % teamIds.length;
  return [...teamIds.slice(r), ...teamIds.slice(0, r)];
}

export function buildTurns(teamIds: string[], format: QuestionDef['format']): Turn[] {
  const turns: Turn[] = [];
  for (const teamId of teamIds) {
    turns.push({ teamId, poolIndex: 0 });
    if (format === 'LINKED') turns.push({ teamId, poolIndex: 1 });
  }
  return turns;
}

export function emptySubmission(teamId: string, poolIndex: number): Submission {
  return {
    teamId,
    poolIndex,
    playerName: '',
    text: '',
    boardItemId: null,
    locked: false,
    matchedAnswerId: null,
    canonical: null,
    score: 100,
    correct: false,
    isZero: false,
    override: null,
    revealed: false,
    revealStartedAt: null,
    submittedBy: 'HOST',
  };
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export const CURRENCIES = [
  { code: 'GBP', label: 'British pound (£)' },
  { code: 'USD', label: 'US dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'KWD', label: 'Kuwaiti dinar (KD)' },
  { code: 'AUD', label: 'Australian dollar (A$)' },
  { code: 'CAD', label: 'Canadian dollar (C$)' },
  { code: 'AED', label: 'UAE dirham' },
  { code: 'SAR', label: 'Saudi riyal' },
  { code: 'INR', label: 'Indian rupee (₹)' },
];
