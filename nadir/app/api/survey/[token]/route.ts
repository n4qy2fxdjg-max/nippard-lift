import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { fail, HttpError, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

/** Public: the survey's question, timer and whether the caller already took part. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const s = await prisma.survey.findUnique({ where: { token }, select: { id: true, title: true, questionText: true, instructions: true, status: true, timerSeconds: true, participantLimit: true } });
    if (!s) throw new HttpError(404, 'Survey not found');
    const anonId = req.cookies.get('nadir_survey_anon')?.value;
    const completed = await prisma.surveyParticipant.count({ where: { surveyId: s.id, completedAt: { not: null }, invalidated: false } });
    const mine = anonId ? await prisma.surveyParticipant.findUnique({ where: { surveyId_anonId: { surveyId: s.id, anonId } }, include: { responses: true } }) : null;
    return ok({ title: s.title, questionText: s.questionText, instructions: s.instructions, timerSeconds: s.timerSeconds, open: s.status === 'OPEN' && completed < s.participantLimit, full: completed >= s.participantLimit, alreadyAnswered: !!mine?.completedAt, startedAt: mine?.startedAt ?? null });
  } catch (e) {
    return fail(e);
  }
}
