import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/util/auth';
import { appUrl, fail, HttpError, ok } from '@/lib/util/http';
import { resolveAccess } from '@/lib/game/access';

export const dynamic = 'force-dynamic';

/** Public metadata (room code, join URL) used by the display and host. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const game = await prisma.game.findUnique({ where: { id }, select: { id: true, name: true, roomCode: true, status: true, currency: true, createdAt: true, teams: { select: { id: true, name: true, color: true }, orderBy: { sortOrder: 'asc' } } } });
    if (!game) throw new HttpError(404, 'Game not found', 'GAME_NOT_FOUND');
    const base = appUrl(req);
    const payload: Record<string, unknown> = { ...game, joinUrl: `${base}/join?code=${game.roomCode}`, displayUrl: `${base}/display/${game.id}` };
    try {
      await resolveAccess(req, id, 'host');
      const full = await prisma.game.findUnique({ where: { id }, select: { hostToken: true } });
      payload.hostToken = full?.hostToken;
    } catch {
      /* not host */
    }
    return ok(payload);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.game.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
