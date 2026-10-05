import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export const categorySchema = z.object({ title: z.string().trim().min(1).max(80), description: z.string().max(300).default(''), status: z.enum(['DRAFT', 'READY', 'USED', 'ARCHIVED']).default('READY'), questionIds: z.array(z.string()).min(1).max(5) });

export async function GET() {
  try {
    await requireAdmin();
    const cats = await prisma.finalCategory.findMany({ orderBy: { createdAt: 'desc' }, include: { prompts: { orderBy: { sortOrder: 'asc' }, include: { question: { select: { id: true, text: true, category: true, answers: { select: { score: true, correct: true } } } } } } } });
    return ok(cats.map((c) => ({ id: c.id, title: c.title, description: c.description, status: c.status, prompts: c.prompts.map((p) => ({ id: p.question.id, text: p.question.text, category: p.question.category, answerCount: p.question.answers.filter((a) => a.correct).length, zeroCount: p.question.answers.filter((a) => a.correct && a.score === 0).length })) })));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = categorySchema.parse(await req.json());
    const cat = await prisma.finalCategory.create({ data: { title: input.title, description: input.description, status: input.status, prompts: { create: input.questionIds.map((qid, i) => ({ questionId: qid, sortOrder: i })) } } });
    return ok({ id: cat.id }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
