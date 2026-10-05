/**
 * Core domain types for NADIR.
 *
 * Everything the engine needs lives here. The reducer in `engine.ts` is a pure function
 * over these types; persistence, realtime and UI are layered on top.
 */

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export type QuestionFormat = 'OPEN' | 'BOARD' | 'CLUES' | 'LINKED' | 'PICTURE' | 'PARTIAL';
export const QUESTION_FORMATS: QuestionFormat[] = ['OPEN', 'BOARD', 'CLUES', 'LINKED', 'PICTURE', 'PARTIAL'];

export const FORMAT_LABELS: Record<QuestionFormat, string> = {
  OPEN: 'Open answer',
  BOARD: 'Possible answers board',
  CLUES: 'Clues & answers',
  LINKED: 'Linked categories',
  PICTURE: 'Picture board',
  PARTIAL: 'Partial / scrambled',
};

export type BoardItemKind = 'TEXT' | 'CLUE' | 'IMAGE' | 'PARTIAL' | 'SCRAMBLED';

export type PictureMode = 'IMAGE_ONLY' | 'IMAGE_LETTERS' | 'IMAGE_CLUE' | 'IMAGE_QUESTION' | 'NUMBERED';

export interface AnswerDef {
  id: string;
  /** 0 for most formats; LINKED questions use 0 (category A) and 1 (category B). */
  poolIndex: number;
  canonical: string;
  aliases: string[];
  /** Survey score 0..100. */
  score: number;
  correct: boolean;
  explanation?: string;
  /** Board-style formats: the board item this answer belongs to. */
  boardItemId?: string | null;
}

export interface BoardItemDef {
  id: string;
  kind: BoardItemKind;
  label: string;
  /** CLUE: the clue; PARTIAL/SCRAMBLED: the puzzle text. */
  clue: string;
  imageUrl?: string | null;
  decoy: boolean;
  sortOrder: number;
}

export interface QuestionSettings {
  boardColumns?: number;
  /** LINKED: labels for pool 0 and pool 1. */
  poolLabels?: [string, string];
  pictureMode?: PictureMode;
  /** BOARD: remove the chosen card from the board after selection (default true). */
  removeOnPick?: boolean;
}

export interface QuestionDef {
  id: string;
  category: string;
  text: string;
  instructions: string;
  format: QuestionFormat;
  difficulty: number;
  explanation: string;
  settings: QuestionSettings;
  answers: AnswerDef[];
  boardItems: BoardItemDef[];
  mediaUrl?: string | null;
}

export interface FinalCategoryDef {
  id: string;
  title: string;
  description: string;
  prompts: QuestionDef[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type RoundType = 'ELIMINATION' | 'HEAD_TO_HEAD' | 'FINAL';
export type Stage = 'ELIMINATION' | 'TIEBREAK' | 'HEAD_TO_HEAD' | 'FINAL';

export interface RoundPlan {
  type: RoundType;
  /** ELIMINATION: number of passes (one question each). */
  passes: number;
  /** ELIMINATION: teams eliminated at the end of the round. */
  eliminateCount: number;
  /** HEAD_TO_HEAD: best-of count (first to ceil(bestOf/2)). */
  bestOf: number;
  /** ELIMINATION: one question per pass. HEAD_TO_HEAD: one per H2H question (at least bestOf). */
  questionIds: string[];
  /** Reserve questions for tie-breaks. */
  tiebreakQuestionIds: string[];
  /** FINAL: categories offered to the finalists. */
  finalCategoryIds: string[];
}

export type H2HTieRule = 'NO_POINT' | 'SUDDEN_DEATH';
export type H2HAdvantage = 'BEST_CHOOSES' | 'BEST_FIRST' | 'BEST_SECOND';
export type LinkedScoring = 'SUM' | 'MAX' | 'MIN';
export type FinalAnswerMode = 'POOL' | 'PER_PROMPT';
export type PrizeType = 'TROPHY' | 'BADGE' | 'CUSTOM' | 'NONE';

export interface GameConfig {
  currency: string;
  startingJackpot: number;
  zeroBonus: number;
  failedFinalRollover: number;
  finalDiscussionSeconds: number;
  surveyTimerSeconds: number;
  incorrectScore: number;
  /** Seconds a team has to answer once it is their turn. 0 disables the timer. */
  teamAnswerSeconds: number;
  /** When true the engine moves from ANSWER_LOCKED straight into REVEALING_SCORE. */
  autoReveal: boolean;
  h2hTieRule: H2HTieRule;
  h2hAdvantage: H2HAdvantage;
  linkedScoring: LinkedScoring;
  finalAnswerMode: FinalAnswerMode;
  finalAnswerCount: number;
  animations: boolean;
  sound: boolean;
  prize: { type: PrizeType; label: string };
  /** Public-facing name for a zero-score answer. */
  zeroTerm: string;
  rounds: RoundPlan[];
}

export const DEFAULT_ZERO_TERM = 'Ghost Answer';

export const DEFAULT_CONFIG: Omit<GameConfig, 'rounds'> = {
  currency: 'GBP',
  startingJackpot: 1000,
  zeroBonus: 250,
  failedFinalRollover: 1000,
  finalDiscussionSeconds: 60,
  surveyTimerSeconds: 100,
  incorrectScore: 100,
  teamAnswerSeconds: 0,
  autoReveal: false,
  h2hTieRule: 'NO_POINT',
  h2hAdvantage: 'BEST_CHOOSES',
  linkedScoring: 'SUM',
  finalAnswerMode: 'POOL',
  finalAnswerCount: 3,
  animations: true,
  sound: true,
  prize: { type: 'TROPHY', label: 'The Nadir Trophy' },
  zeroTerm: DEFAULT_ZERO_TERM,
};

/** Default structure for N teams: eliminate one team per round until two remain, then H2H, then Final. */
export function defaultRoundPlans(teamCount: number, passesPerRound = 1): RoundPlan[] {
  const plans: RoundPlan[] = [];
  for (let remaining = teamCount; remaining > 2; remaining--) {
    plans.push({ type: 'ELIMINATION', passes: passesPerRound, eliminateCount: 1, bestOf: 3, questionIds: [], tiebreakQuestionIds: [], finalCategoryIds: [] });
  }
  plans.push({ type: 'HEAD_TO_HEAD', passes: 1, eliminateCount: 1, bestOf: 3, questionIds: [], tiebreakQuestionIds: [], finalCategoryIds: [] });
  plans.push({ type: 'FINAL', passes: 1, eliminateCount: 0, bestOf: 1, questionIds: [], tiebreakQuestionIds: [], finalCategoryIds: [] });
  return plans;
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

export type Phase =
  | 'LOBBY'
  | 'INTRO'
  | 'TEAM_INTRO'
  | 'ROUND_INTRO'
  | 'QUESTION_INTRO'
  | 'QUESTION_REVEALED'
  | 'ACCEPTING_ANSWER'
  | 'ANSWER_LOCKED'
  | 'REVEALING_SCORE'
  | 'SCORE_REVEALED'
  | 'PASS_RESULTS'
  | 'ROUND_RESULTS'
  | 'ELIMINATION'
  | 'TIEBREAK_INTRO'
  | 'HEAD_TO_HEAD_INTRO'
  | 'HEAD_TO_HEAD_RESULT'
  | 'FINAL_INTRO'
  | 'FINAL_CATEGORY_SELECTION'
  | 'FINAL_PROMPTS'
  | 'FINAL_DISCUSSION'
  | 'FINAL_SUBMISSION'
  | 'FINAL_REVEAL'
  | 'VICTORY'
  | 'DEFEAT'
  | 'GAME_OVER';

export interface PlayerState {
  id: string;
  name: string;
}

export interface TeamState {
  id: string;
  name: string;
  color: string;
  players: PlayerState[];
  eliminatedRound: number | null;
  connected: boolean;
}

export type OverrideKind = 'CORRECT' | 'INCORRECT' | 'CANONICAL' | 'SCORE';

export interface Submission {
  teamId: string;
  poolIndex: number;
  playerName: string;
  text: string;
  boardItemId: string | null;
  /** Set when the host locks the answer. */
  locked: boolean;
  matchedAnswerId: string | null;
  canonical: string | null;
  score: number;
  correct: boolean;
  isZero: boolean;
  override: OverrideKind | null;
  /** Score has been revealed on the display. */
  revealed: boolean;
  /** Timestamp the reveal animation started (display resumes from it after refresh). */
  revealStartedAt: number | null;
  submittedBy: 'TEAM' | 'HOST';
}

export interface Turn {
  teamId: string;
  poolIndex: number;
}

export interface QuestionRun {
  questionId: string;
  stage: Stage;
  roundIndex: number;
  passIndex: number;
  /** Which teams are playing this question (tie-break subsets, H2H pair). */
  participantTeamIds: string[];
  turns: Turn[];
  turnIndex: number;
  submissions: Record<string, Submission>; // key: `${teamId}:${poolIndex}`
  revealed: { question: boolean; instructions: boolean; board: boolean };
  /** Board items claimed (correctly answered / removed). */
  usedBoardItemIds: string[];
  resultsRevealed: { low: boolean; high: boolean };
  /** Nth tie-break within the round, 1-based (0 for non tie-breaks). */
  tiebreakNumber: number;
}

export interface RoundScores {
  /** teamId -> per-pass score (undefined when not yet played). */
  [teamId: string]: (number | null)[];
}

export interface H2HQuestionResult {
  questionId: string;
  scores: Record<string, number>;
  winnerTeamId: string | null;
}

export interface H2HState {
  teamIds: [string, string];
  points: Record<string, number>;
  questionIndex: number;
  results: H2HQuestionResult[];
  /** Team that holds the opening advantage (lower elimination total). */
  advantageTeamId: string;
  /** Team answering first on the current question (null until decided). */
  firstTeamId: string | null;
  winnerTeamId: string | null;
  bestOf: number;
}

export interface FinalAnswerResult {
  text: string;
  promptId: string | null;
  matchedAnswerId: string | null;
  canonical: string | null;
  score: number;
  correct: boolean;
  isZero: boolean;
  override: OverrideKind | null;
  revealStartedAt: number | null;
}

export interface FinalState {
  teamId: string;
  categoryOptions: { id: string; title: string }[];
  chosenCategoryId: string | null;
  promptsRevealed: boolean;
  /** Raw submitted answers (not yet scored while discussing). */
  answers: { text: string; promptId: string | null }[];
  results: FinalAnswerResult[];
  /** Number of results whose reveal has started. */
  revealedCount: number;
  /** Number of results whose reveal animation has completed. */
  completedCount: number;
  outcome: 'WON' | 'LOST' | null;
  jackpotAtStake: number;
}

export interface TimerState {
  kind: 'NONE' | 'FINAL' | 'TEAM';
  durationMs: number;
  /** Absolute epoch ms when the timer hits zero (null while paused / not started). */
  endsAt: number | null;
  /** Remaining ms captured when paused. */
  remainingMs: number;
  running: boolean;
}

export interface JackpotState {
  amount: number;
  startingAmount: number;
  currency: string;
  zeroCount: number;
  history: { at: number; delta: number; reason: string; amount: number }[];
  /** Set when the game completes: the amount the next game should start with. */
  nextGameAmount: number | null;
  won: boolean | null;
}

export interface EliminationRecord {
  roundIndex: number;
  teamIds: string[];
  tieTeamIds: string[];
}

export interface AnswerLogEntry {
  at: number;
  stage: Stage;
  roundIndex: number;
  passIndex: number;
  teamId: string;
  questionId: string;
  playerName: string;
  text: string;
  matchedAnswerId: string | null;
  canonical: string | null;
  score: number;
  correct: boolean;
  isZero: boolean;
  overridden: boolean;
}

export interface GameState {
  id: string;
  name: string;
  roomCode: string;
  config: GameConfig;
  phase: Phase;
  previousPhase: Phase | null;
  teams: TeamState[];
  /** Index into config.rounds. */
  roundIndex: number;
  passIndex: number;
  /** roundIndex -> scores */
  roundScores: Record<number, RoundScores>;
  question: QuestionRun | null;
  /** Pending elimination computed at ROUND_RESULTS; tie means a tiebreak is required. */
  pendingElimination: { eliminate: string[]; tied: string[]; slots: number } | null;
  eliminations: EliminationRecord[];
  tiebreakQuestionsUsed: string[];
  h2h: H2HState | null;
  final: FinalState | null;
  timer: TimerState;
  jackpot: JackpotState;
  /** Running list of events for host display (most recent last, capped). */
  log: { at: number; type: string; summary: string }[];
  /** Every revealed answer in order (feeds history and analytics). */
  answerLog: AnswerLogEntry[];
  /** Debug/demo: next locked answer is forced to this score. */
  forcedScore: number | null;
  winnerTeamId: string | null;
  startedAt: number | null;
  completedAt: number | null;
  /** Monotonic counter mirrored from the DB version; purely informational on the client. */
  version: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Actor = 'HOST' | 'TEAM' | 'SYSTEM';

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'ADVANCE' }
  | { type: 'SHOW_TEAM_INTRO' }
  | { type: 'START_ROUND' }
  | { type: 'REVEAL_QUESTION' }
  | { type: 'REVEAL_INSTRUCTIONS' }
  | { type: 'REVEAL_BOARD' }
  | { type: 'SET_TURN_ORDER'; teamIds: string[] }
  | { type: 'SELECT_TEAM'; teamId: string }
  | { type: 'OPEN_ANSWERS' }
  | { type: 'SUBMIT_ANSWER'; teamId: string; text: string; boardItemId?: string | null; playerName?: string; poolIndex?: number; by: 'TEAM' | 'HOST' }
  | { type: 'CLEAR_ANSWER'; teamId: string; poolIndex?: number }
  | { type: 'LOCK_ANSWER' }
  | { type: 'UNLOCK_ANSWER' }
  | { type: 'MARK_CORRECT'; answerId?: string }
  | { type: 'MARK_INCORRECT' }
  | { type: 'OVERRIDE_SCORE'; score: number }
  | { type: 'REVEAL_SCORE' }
  | { type: 'SCORE_REVEAL_COMPLETE' }
  | { type: 'NEXT_TEAM' }
  | { type: 'REVEAL_LOW_ANSWERS' }
  | { type: 'REVEAL_HIGH_ANSWERS' }
  | { type: 'SHOW_LEADERBOARD' }
  | { type: 'END_PASS' }
  | { type: 'END_ROUND' }
  | { type: 'ELIMINATE'; teamIds?: string[] }
  | { type: 'START_TIEBREAK'; questionId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'H2H_SET_FIRST'; teamId: string }
  | { type: 'H2H_NEXT_QUESTION' }
  | { type: 'START_FINAL' }
  | { type: 'FINAL_SELECT_CATEGORY'; categoryId: string }
  | { type: 'FINAL_REVEAL_PROMPTS' }
  | { type: 'FINAL_START_DISCUSSION' }
  | { type: 'FINAL_SUBMIT_ANSWERS'; answers: { text: string; promptId?: string | null }[]; by: 'TEAM' | 'HOST' }
  | { type: 'FINAL_LOCK_ANSWERS' }
  | { type: 'FINAL_OVERRIDE'; index: number; override: 'CORRECT' | 'INCORRECT' | 'SCORE'; score?: number; answerId?: string }
  | { type: 'FINAL_REVEAL_NEXT' }
  | { type: 'FINAL_REVEAL_COMPLETE' }
  | { type: 'FINAL_FINISH' }
  | { type: 'END_GAME' }
  | { type: 'TIMER_START'; kind?: 'FINAL' | 'TEAM'; seconds?: number }
  | { type: 'TIMER_PAUSE' }
  | { type: 'TIMER_RESUME' }
  | { type: 'TIMER_RESET' }
  | { type: 'TEAM_PRESENCE'; teamId: string; connected: boolean }
  | { type: 'RENAME_TEAM'; teamId: string; name: string }
  | { type: 'DEBUG_FORCE_SCORE'; score: number | null }
  | { type: 'DEBUG_SKIP_TO_H2H' }
  | { type: 'DEBUG_SKIP_TO_FINAL' }
  | { type: 'DEBUG_FORCE_FINAL'; outcome: 'WON' | 'LOST' };

export type GameActionType = GameAction['type'];

/** Actions that never create undo snapshots (presence, timers ticking). */
export const NON_UNDOABLE_ACTIONS: GameActionType[] = ['TEAM_PRESENCE', 'SCORE_REVEAL_COMPLETE', 'FINAL_REVEAL_COMPLETE'];

/** Actions a team controller may issue. */
export const TEAM_ACTIONS: GameActionType[] = ['SUBMIT_ANSWER', 'FINAL_SUBMIT_ANSWERS', 'TEAM_PRESENCE', 'FINAL_SELECT_CATEGORY'];

// ---------------------------------------------------------------------------
// Engine context
// ---------------------------------------------------------------------------

export interface EngineContext {
  /** Full question definitions (including hidden scores) for every question in the game. */
  questions: Record<string, QuestionDef>;
  finalCategories: Record<string, FinalCategoryDef>;
  now: number;
}

export class EngineError extends Error {
  constructor(message: string, public readonly code: string = 'INVALID_ACTION') {
    super(message);
    this.name = 'EngineError';
  }
}

export const submissionKey = (teamId: string, poolIndex: number) => `${teamId}:${poolIndex}`;
