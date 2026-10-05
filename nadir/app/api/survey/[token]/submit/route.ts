import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { normalizeAnswer } from '@/lib/matching';
import { fail, HttpError, ok } from '@/lib/util/http';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { answer } = z.object({ answer: z.string().max(120) }).parse(await req.json());
    const s = await prisma.survey.findUnique({ where: { token } });
    if (!s) throw new HttpError(404, 'Survey not found');
    if (s.status !== 'OPEN') throw new HttpError(410, 'This survey is closed');
    const anonId = req.cookies.get('nadir_survey_anon')?.value;
    if (!anonId) throw new HttpError(400, 'Start the survey first');
    const participant = await prisma.surveyParticipant.findUnique({ where: { surveyId_anonId: { surveyId: s.id, anonId } } });
    if (!participant) throw new HttpError(400, 'Start the survey first');
    if (participant.completedAt) throw new HttpError(409, 'Already answered');
    const elapsedMs = Date.now() - participant.startedAt.getTime();
    // A grace period covers network latency; wildly late answers are stored but flagged invalid.
    const late = elapsedMs > (s.timerSeconds + 15) * 1000;
    const raw = answer.trim();
    const valid = !late && raw.length > 0;
    await prisma.$transaction([
      prisma.surveyResponse.create({ data: { surveyId: s.id, participantId: participant.id, rawAnswer: raw, normalizedAnswer: normalizeAnswer(raw), elapsedMs, valid } }),
      prisma.surveyParticipant.update({ where: { id: participant.id }, data: { completedAt: new Date(), invalidated: !valid, invalidReason: late ? 'Answered after the timer' : raw ? '' : 'Blank answer' } }),
    ]);
    const completed = await prisma.surveyParticipant.count({ where: { surveyId: s.id, completedAt: { not: null }, invalidated: false } });
    if (completed >= s.participantLimit) await prisma.survey.update({ where: { id: s.id }, data: { status: 'CLOSED', closedAt: new Date() } });
    return ok({ ok: true, late, remaining: Math.max(0, s.participantLimit - completed) });
  } catch (e) {
    return fail(e);
  }
}
