import { NextRequest } from 'next/server';
import { z } from 'zod';
import { findGameByRoomCode } from '@/lib/game/service';
import { fail, HttpError, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

/** Looks up a room code: returns the teams a phone can join as. */
export async function GET(req: NextRequest) {
  try {
    const code = new URL(req.url).searchParams.get('code') ?? '';
    if (code.length < 4) throw new HttpError(400, 'Enter the 5-character room code', 'BAD_CODE');
    const game = await findGameByRoomCode(code);
    if (!game) throw new HttpError(404, 'No game with that room code', 'ROOM_NOT_FOUND');
    if (game.status === 'COMPLETED' || game.status === 'ABANDONED') throw new HttpError(410, 'That game has finished', 'GAME_OVER');
    return ok({ gameId: game.id, name: game.name, status: game.status, teams: game.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, players: t.players.map((p) => p.name) })) });
  } catch (e) {
    return fail(e);
  }
}

/** Joins a team: returns the team token the controller stores. */
export async function POST(req: NextRequest) {
  try {
    const { code, teamId } = z.object({ code: z.string().min(4).max(8), teamId: z.string().min(1) }).parse(await req.json());
    const game = await findGameByRoomCode(code);
    if (!game) throw new HttpError(404, 'No game with that room code', 'ROOM_NOT_FOUND');
    if (game.status === 'COMPLETED' || game.status === 'ABANDONED') throw new HttpError(410, 'That game has finished', 'GAME_OVER');
    const team = game.teams.find((t) => t.id === teamId);
    if (!team) throw new HttpError(404, 'Team not found', 'TEAM_NOT_FOUND');
    return ok({ gameId: game.id, teamId: team.id, teamName: team.name, token: team.token });
  } catch (e) {
    return fail(e);
  }
}
