import { NextRequest } from 'next/server';
import { loadGame } from '@/lib/game/service';
import { resolveAccess, type Role } from '@/lib/game/access';
import { projectDisplay, projectHost, projectTeam } from '@/lib/game-engine/views';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const role = (url.searchParams.get('role') ?? 'display') as Role;
    const teamId = url.searchParams.get('teamId');
    const access = await resolveAccess(req, id, role, teamId);
    const { state, ctx, status } = await loadGame(id);
    const view = access.role === 'host' ? projectHost(state, ctx) : access.role === 'team' ? projectTeam(state, ctx, access.teamId!) : projectDisplay(state, ctx);
    return ok({ ...view, status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return fail(e);
  }
}
