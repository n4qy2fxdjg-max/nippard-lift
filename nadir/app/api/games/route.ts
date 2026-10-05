import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createGame } from '@/lib/game/service';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

const roundSchema = z.object({
  type: z.enum(['ELIMINATION', 'HEAD_TO_HEAD', 'FINAL']),
  passes: z.number().int().min(1).max(5).default(1),
  eliminateCount: z.number().int().min(0).max(6).default(1),
  bestOf: z.number().int().min(1).max(9).default(3),
  questionIds: z.array(z.string()).default([]),
  tiebreakQuestionIds: z.array(z.string()).default([]),
  finalCategoryIds: z.array(z.string()).default([]),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  selectionMode: z.enum(['MANUAL', 'RANDOM', 'SMART_RANDOM']).default('SMART_RANDOM'),
  jackpotOverride: z.number().int().min(0).nullable().optional(),
  teams: z.array(z.object({ name: z.string().min(1).max(40), players: z.array(z.string().max(40)).max(4).default([]), color: z.string().optional() })).min(2).max(8),
  config: z.object({
    currency: z.string().min(3).max(3).optional(),
    startingJackpot: z.number().int().min(0).optional(),
    zeroBonus: z.number().int().min(0).optional(),
    failedFinalRollover: z.number().int().min(0).optional(),
    finalDiscussionSeconds: z.number().int().min(10).max(600).optional(),
    surveyTimerSeconds: z.number().int().min(10).max(600).optional(),
    incorrectScore: z.number().int().min(1).max(100).optional(),
    teamAnswerSeconds: z.number().int().min(0).max(600).optional(),
    autoReveal: z.boolean().optional(),
    h2hTieRule: z.enum(['NO_POINT', 'SUDDEN_DEATH']).optional(),
    h2hAdvantage: z.enum(['BEST_CHOOSES', 'BEST_FIRST', 'BEST_SECOND']).optional(),
    linkedScoring: z.enum(['SUM', 'MAX', 'MIN']).optional(),
    finalAnswerMode: z.enum(['POOL', 'PER_PROMPT']).optional(),
    finalAnswerCount: z.number().int().min(1).max(5).optional(),
    animations: z.boolean().optional(),
    sound: z.boolean().optional(),
    prize: z.object({ type: z.enum(['TROPHY', 'BADGE', 'CUSTOM', 'NONE']), label: z.string().max(80) }).optional(),
    zeroTerm: z.string().min(1).max(30).optional(),
    rounds: z.array(roundSchema).min(1),
  }),
});

export async function GET() {
  try {
    await requireAdmin();
    const games = await prisma.game.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, name: true, roomCode: true, status: true, currency: true, createdAt: true, completedAt: true, zeroCount: true, finalJackpot: true, jackpotWon: true, winnerTeamId: true, hostToken: true, teams: { select: { id: true, name: true, color: true }, orderBy: { sortOrder: 'asc' } } } });
    const banks = await prisma.jackpot.findMany();
    return ok({ games, banks });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const game = await createGame({ name: input.name, selectionMode: input.selectionMode, jackpotOverride: input.jackpotOverride ?? null, teams: input.teams, config: input.config });
    return ok({ id: game.id, roomCode: game.roomCode, hostToken: game.hostToken }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
