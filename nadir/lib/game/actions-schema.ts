import { z } from 'zod';

const text = z.string().max(200);
const id = z.string().min(1).max(64);

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('START_GAME') }),
  z.object({ type: z.literal('ADVANCE') }),
  z.object({ type: z.literal('SHOW_TEAM_INTRO') }),
  z.object({ type: z.literal('START_ROUND') }),
  z.object({ type: z.literal('REVEAL_QUESTION') }),
  z.object({ type: z.literal('REVEAL_INSTRUCTIONS') }),
  z.object({ type: z.literal('REVEAL_BOARD') }),
  z.object({ type: z.literal('SET_TURN_ORDER'), teamIds: z.array(id).max(8) }),
  z.object({ type: z.literal('SELECT_TEAM'), teamId: id }),
  z.object({ type: z.literal('OPEN_ANSWERS') }),
  z.object({ type: z.literal('SUBMIT_ANSWER'), teamId: id, text: text.default(''), boardItemId: id.nullable().optional(), playerName: z.string().max(60).optional(), poolIndex: z.number().int().min(0).max(1).optional(), by: z.enum(['TEAM', 'HOST']).default('HOST') }),
  z.object({ type: z.literal('CLEAR_ANSWER'), teamId: id, poolIndex: z.number().int().optional() }),
  z.object({ type: z.literal('LOCK_ANSWER') }),
  z.object({ type: z.literal('UNLOCK_ANSWER') }),
  z.object({ type: z.literal('MARK_CORRECT'), answerId: id.optional() }),
  z.object({ type: z.literal('MARK_INCORRECT') }),
  z.object({ type: z.literal('OVERRIDE_SCORE'), score: z.number().min(0).max(100) }),
  z.object({ type: z.literal('REVEAL_SCORE') }),
  z.object({ type: z.literal('SCORE_REVEAL_COMPLETE') }),
  z.object({ type: z.literal('NEXT_TEAM') }),
  z.object({ type: z.literal('REVEAL_LOW_ANSWERS') }),
  z.object({ type: z.literal('REVEAL_HIGH_ANSWERS') }),
  z.object({ type: z.literal('SHOW_LEADERBOARD') }),
  z.object({ type: z.literal('END_PASS') }),
  z.object({ type: z.literal('END_ROUND') }),
  z.object({ type: z.literal('ELIMINATE'), teamIds: z.array(id).optional() }),
  z.object({ type: z.literal('START_TIEBREAK'), questionId: id }),
  z.object({ type: z.literal('NEXT_ROUND') }),
  z.object({ type: z.literal('H2H_SET_FIRST'), teamId: id }),
  z.object({ type: z.literal('H2H_NEXT_QUESTION') }),
  z.object({ type: z.literal('START_FINAL') }),
  z.object({ type: z.literal('FINAL_SELECT_CATEGORY'), categoryId: id }),
  z.object({ type: z.literal('FINAL_REVEAL_PROMPTS') }),
  z.object({ type: z.literal('FINAL_START_DISCUSSION') }),
  z.object({ type: z.literal('FINAL_SUBMIT_ANSWERS'), answers: z.array(z.object({ text: text, promptId: id.nullable().optional() })).max(5), by: z.enum(['TEAM', 'HOST']).default('HOST') }),
  z.object({ type: z.literal('FINAL_LOCK_ANSWERS') }),
  z.object({ type: z.literal('FINAL_OVERRIDE'), index: z.number().int().min(0).max(4), override: z.enum(['CORRECT', 'INCORRECT', 'SCORE']), score: z.number().min(0).max(100).optional(), answerId: id.optional() }),
  z.object({ type: z.literal('FINAL_REVEAL_NEXT') }),
  z.object({ type: z.literal('FINAL_REVEAL_COMPLETE') }),
  z.object({ type: z.literal('FINAL_FINISH') }),
  z.object({ type: z.literal('END_GAME') }),
  z.object({ type: z.literal('TIMER_START'), kind: z.enum(['FINAL', 'TEAM']).optional(), seconds: z.number().int().min(1).max(3600).optional() }),
  z.object({ type: z.literal('TIMER_PAUSE') }),
  z.object({ type: z.literal('TIMER_RESUME') }),
  z.object({ type: z.literal('TIMER_RESET') }),
  z.object({ type: z.literal('TEAM_PRESENCE'), teamId: id, connected: z.boolean() }),
  z.object({ type: z.literal('RENAME_TEAM'), teamId: id, name: z.string().min(1).max(40) }),
  z.object({ type: z.literal('DEBUG_FORCE_SCORE'), score: z.number().int().min(0).max(100).nullable() }),
  z.object({ type: z.literal('DEBUG_SKIP_TO_H2H') }),
  z.object({ type: z.literal('DEBUG_SKIP_TO_FINAL') }),
  z.object({ type: z.literal('DEBUG_FORCE_FINAL'), outcome: z.enum(['WON', 'LOST']) }),
]);

export const DEBUG_ACTIONS = ['DEBUG_FORCE_SCORE', 'DEBUG_SKIP_TO_H2H', 'DEBUG_SKIP_TO_FINAL', 'DEBUG_FORCE_FINAL'];

export function debugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
}
