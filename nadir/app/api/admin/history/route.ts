import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const games = await prisma.game.findMany({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, select: { id: true, name: true, currency: true, completedAt: true, createdAt: true, finalJackpot: true, jackpotWon: true, zeroCount: true, winnerTeamId: true, teams: { select: { id: true, name: true, color: true, eliminatedRound: true }, orderBy: { sortOrder: 'asc' } }, _count: { select: { answers: true } } } });
    return ok(games.map((g) => ({ ...g, winner: g.teams.find((t) => t.id === g.winnerTeamId)?.name ?? null })));
  } catch (e) {
    return fail(e);
  }
}
