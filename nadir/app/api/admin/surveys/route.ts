import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';
import { generateSurveyToken } from '@/lib/util/ids';

export const dynamic = 'force-dynamic';

/** Field schemas without defaults so PATCH can be a true partial update. */
export const surveyFields = {
  title: z.string().trim().min(1).max(100),
  category: z.string().max(60),
  questionText: z.string().trim().min(1).max(400),
  instructions: z.string().max(600),
  participantLimit: z.number().int().min(1).max(10000),
  timerSeconds: z.number().int().min(10).max(600),
  acceptedAnswers: z.array(z.object({ canonical: z.string().trim().min(1).max(120), aliases: z.array(z.string().trim().max(120)).default([]) })),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED']),
};

export const surveySchema = z.object({
  ...surveyFields,
  category: surveyFields.category.default(''),
  instructions: surveyFields.instructions.default(''),
  participantLimit: surveyFields.participantLimit.default(100),
  timerSeconds: surveyFields.timerSeconds.default(100),
  acceptedAnswers: surveyFields.acceptedAnswers.default([]),
  status: surveyFields.status.optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const surveys = await prisma.survey.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { participants: true, responses: true } }, question: { select: { id: true } } } });
    const completedCounts = await prisma.surveyParticipant.groupBy({ by: ['surveyId'], where: { completedAt: { not: null }, invalidated: false }, _count: true });
    const cc = Object.fromEntries(completedCounts.map((c) => [c.surveyId, c._count]));
    return ok(surveys.map((s) => ({ id: s.id, title: s.title, category: s.category, questionText: s.questionText, status: s.status, token: s.token, participantLimit: s.participantLimit, timerSeconds: s.timerSeconds, started: s._count.participants, completed: cc[s.id] ?? 0, createdAt: s.createdAt, questionId: s.question?.id ?? null })));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = surveySchema.parse(await req.json());
    const s = await prisma.survey.create({ data: { title: input.title, category: input.category, questionText: input.questionText, instructions: input.instructions, participantLimit: input.participantLimit, timerSeconds: input.timerSeconds, acceptedAnswersJson: JSON.stringify(input.acceptedAnswers), token: generateSurveyToken(), status: 'DRAFT' } });
    return ok({ id: s.id, token: s.token }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
