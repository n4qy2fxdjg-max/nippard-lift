import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma, json } from '@/lib/db/prisma';
import { tallySurvey } from '@/lib/survey';
import { requireAdmin } from '@/lib/util/auth';
import { fail, HttpError, ok } from '@/lib/util/http';
import { surveyFields } from '../route';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const s = await prisma.survey.findUnique({ where: { id }, include: { question: { select: { id: true, status: true } }, participants: { orderBy: { startedAt: 'desc' }, include: { responses: true } } } });
    if (!s) throw new HttpError(404, 'Survey not found');
    const tally = await tallySurvey(id);
    return ok({
      id: s.id,
      title: s.title,
      category: s.category,
      questionText: s.questionText,
      instructions: s.instructions,
      status: s.status,
      token: s.token,
      participantLimit: s.participantLimit,
      timerSeconds: s.timerSeconds,
      acceptedAnswers: json.parse(s.acceptedAnswersJson, []),
      normalization: json.parse(s.normalizationJson, {}),
      question: s.question,
      createdAt: s.createdAt,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      tally,
      participants: s.participants.map((p) => ({ id: p.id, anonId: p.anonId.slice(0, 8), startedAt: p.startedAt, completedAt: p.completedAt, invalidated: p.invalidated, invalidReason: p.invalidReason, answer: p.responses[0]?.rawAnswer ?? null, elapsedMs: p.responses[0]?.elapsedMs ?? null })),
    });
  } catch (e) {
    return fail(e);
  }
}

const patchSchema = z.object(surveyFields).partial().extend({
  normalization: z.record(z.string(), z.string().nullable()).optional(),
  invalidate: z.object({ participantId: z.string(), invalidated: z.boolean(), reason: z.string().max(200).default('') }).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = patchSchema.parse(await req.json());
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Survey not found');
    if (input.invalidate) {
      await prisma.surveyParticipant.update({ where: { id: input.invalidate.participantId }, data: { invalidated: input.invalidate.invalidated, invalidReason: input.invalidate.reason } });
    }
    const data: Record<string, unknown> = {};
    for (const k of ['title', 'category', 'questionText', 'instructions', 'participantLimit', 'timerSeconds'] as const) if (input[k] !== undefined) data[k] = input[k];
    if (input.acceptedAnswers) data.acceptedAnswersJson = JSON.stringify(input.acceptedAnswers);
    if (input.normalization) data.normalizationJson = JSON.stringify(input.normalization);
    if (input.status) {
      data.status = input.status;
      if (input.status === 'OPEN' && !existing.openedAt) data.openedAt = new Date();
      if (input.status === 'CLOSED') data.closedAt = new Date();
    }
    await prisma.survey.update({ where: { id }, data });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.survey.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
