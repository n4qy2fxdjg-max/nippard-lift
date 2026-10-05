import { NextRequest } from 'next/server';
import { undoLastAction } from '@/lib/game/service';
import { resolveAccess } from '@/lib/game/access';
import { projectHost } from '@/lib/game-engine/views';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await resolveAccess(req, id, 'host');
    const { state, ctx } = await undoLastAction(id);
    return ok(projectHost(state, ctx));
  } catch (e) {
    return fail(e);
  }
}
