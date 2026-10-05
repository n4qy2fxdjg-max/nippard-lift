import { NextRequest } from 'next/server';
import { applyAction, loadGame } from '@/lib/game/service';
import { resolveAccess, type Role } from '@/lib/game/access';
import { actionSchema, DEBUG_ACTIONS, debugEnabled } from '@/lib/game/actions-schema';
import { projectHost, projectTeam } from '@/lib/game-engine/views';
import { TEAM_ACTIONS, type GameAction } from '@/lib/game-engine/types';
import { fail, HttpError, ok } from '@/lib/util/http';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const role = (body.role ?? 'host') as Role;
    const access = await resolveAccess(req, id, role, body.teamId ?? null);
    const action = actionSchema.parse(body.action) as GameAction;
    if (DEBUG_ACTIONS.includes(action.type) && !debugEnabled()) throw new HttpError(403, 'Debug actions are disabled', 'DEBUG_DISABLED');

    if (access.role === 'team') {
      if (!TEAM_ACTIONS.includes(action.type)) throw new HttpError(403, 'Teams cannot perform that action', 'FORBIDDEN');
      // Teams may only act for themselves.
      if ('teamId' in action && action.teamId !== access.teamId) throw new HttpError(403, 'Wrong team', 'FORBIDDEN');
      if (action.type === 'SUBMIT_ANSWER') action.by = 'TEAM';
      if (action.type === 'FINAL_SUBMIT_ANSWERS') action.by = 'TEAM';
      if (action.type === 'FINAL_SELECT_CATEGORY') {
        const { state } = await loadGame(id);
        if (state.final?.teamId !== access.teamId) throw new HttpError(403, 'Only the finalists choose', 'FORBIDDEN');
      }
    }
    if (access.role === 'display') throw new HttpError(403, 'Display is read-only', 'FORBIDDEN');

    // Tie-break questions may come from outside the plan; make sure the engine can load them.
    const extra = action.type === 'START_TIEBREAK' ? [action.questionId] : [];
    if (extra.length) {
      const exists = await prisma.question.findUnique({ where: { id: extra[0] }, select: { id: true } });
      if (!exists) throw new HttpError(404, 'Question not found');
    }
    const actor = access.role === 'team' ? 'TEAM' : action.type === 'TEAM_PRESENCE' ? 'SYSTEM' : 'HOST';
    const { state, ctx } = await applyAction(id, action, actor, { extraQuestionIds: extra });
    const view = access.role === 'team' ? projectTeam(state, ctx, access.teamId!) : projectHost(state, ctx);
    return ok(view);
  } catch (e) {
    return fail(e);
  }
}
