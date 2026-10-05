import { NextRequest } from 'next/server';
import { prisma, json } from '@/lib/db/prisma';
import type { GameState } from '@/lib/game-engine/types';
import { requireAdmin } from '@/lib/util/auth';
import { fail, HttpError, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const game = await prisma.game.findUnique({ where: { id }, include: { teams: { include: { players: true }, orderBy: { sortOrder: 'asc' } }, answers: { include: { question: { select: { text: true, category: true } } }, orderBy: { createdAt: 'asc' } }, events: { orderBy: { seq: 'asc' }, select: { seq: true, type: true, actor: true, payloadJson: true, createdAt: true } }, rounds: { include: { questions: { include: { question: { select: { id: true, text: true, category: true, format: true } } } } }, orderBy: { index: 'asc' } } } });
    if (!game) throw new HttpError(404, 'Game not found');
    const state = json.parse<GameState | null>(game.stateJson, null);
    return ok({
      id: game.id,
      name: game.name,
      status: game.status,
      currency: game.currency,
      createdAt: game.createdAt,
      completedAt: game.completedAt,
      finalJackpot: game.finalJackpot,
      jackpotWon: game.jackpotWon,
      zeroCount: game.zeroCount,
      winnerTeamId: game.winnerTeamId,
      teams: game.teams,
      answers: game.answers.map((a) => ({ ...a, question: a.question })),
      events: game.events.map((e) => ({ ...e, payload: json.parse(e.payloadJson, {}) })),
      rounds: game.rounds.map((r) => ({ index: r.index, type: r.type, passes: r.passes, questions: r.questions.map((q) => ({ ...q.question, role: q.role })) })),
      roundScores: state?.roundScores ?? {},
      jackpotHistory: state?.jackpot.history ?? [],
      final: state?.final ?? null,
      h2h: state?.h2h ?? null,
    });
  } catch (e) {
    return fail(e);
  }
}
