import { NextRequest } from 'next/server';
import { loadGame, tiebreakOptions } from '@/lib/game/service';
import { resolveAccess } from '@/lib/game/access';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await resolveAccess(req, id, 'host');
    const { state } = await loadGame(id);
    return ok(await tiebreakOptions(state));
  } catch (e) {
    return fail(e);
  }
}
