import { prisma } from '@/lib/db/prisma';
import { isAdmin } from '@/lib/util/auth';
import { HttpError } from '@/lib/util/http';

export type Role = 'host' | 'display' | 'team';

export interface Access {
  role: Role;
  teamId?: string;
}

/** Resolves who is calling for a game: host (token or admin cookie), team (team token) or display. */
export async function resolveAccess(req: Request, gameId: string, requested: Role, teamIdParam?: string | null): Promise<Access> {
  if (requested === 'display') return { role: 'display' };
  if (requested === 'host') {
    const token = req.headers.get('x-host-token') ?? new URL(req.url).searchParams.get('hostToken');
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { hostToken: true } });
    if (!game) throw new HttpError(404, 'Game not found', 'GAME_NOT_FOUND');
    if (token && token === game.hostToken) return { role: 'host' };
    // A signed-in admin (password configured) may also host. Without a configured password the
    // admin area is open for local use, so the host token is the only key to hidden scores.
    if (process.env.ADMIN_PASSWORD && (await isAdmin())) return { role: 'host' };
    throw new HttpError(401, 'Host token required', 'HOST_REQUIRED');
  }
  const token = req.headers.get('x-team-token') ?? new URL(req.url).searchParams.get('teamToken');
  if (!token || !teamIdParam) throw new HttpError(401, 'Team token required', 'TEAM_REQUIRED');
  const team = await prisma.team.findUnique({ where: { id: teamIdParam }, select: { token: true, gameId: true } });
  if (!team || team.gameId !== gameId || team.token !== token) throw new HttpError(401, 'Invalid team token', 'TEAM_INVALID');
  return { role: 'team', teamId: teamIdParam };
}
