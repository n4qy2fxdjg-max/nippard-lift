import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { fail, HttpError } from '@/lib/util/http';
import { generateToken } from '@/lib/util/ids';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const s = await prisma.survey.findUnique({ where: { token } });
    if (!s) throw new HttpError(404, 'Survey not found');
    if (s.status !== 'OPEN') throw new HttpError(410, 'This survey is not accepting responses');
    const completed = await prisma.surveyParticipant.count({ where: { surveyId: s.id, completedAt: { not: null }, invalidated: false } });
    if (completed >= s.participantLimit) throw new HttpError(410, 'This survey has enough responses. Thank you!');
    let anonId = req.cookies.get('nadir_survey_anon')?.value;
    if (!anonId) anonId = generateToken();
    const ua = req.headers.get('user-agent') ?? '';
    const ip = req.headers.get('x-forwarded-for') ?? '';
    const fingerprint = createHash('sha256').update(`${ua}|${ip}`).digest('hex').slice(0, 24);
    const existing = await prisma.surveyParticipant.findUnique({ where: { surveyId_anonId: { surveyId: s.id, anonId } } });
    if (existing?.completedAt) throw new HttpError(409, 'You have already answered this survey');
    const participant = existing ?? (await prisma.surveyParticipant.create({ data: { surveyId: s.id, anonId, fingerprint } }));
    const res = NextResponse.json({ participantId: participant.id, startedAt: participant.startedAt, timerSeconds: s.timerSeconds });
    res.cookies.set('nadir_survey_anon', anonId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  } catch (e) {
    return fail(e);
  }
}
