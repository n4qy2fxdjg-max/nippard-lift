import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { listQuestionSummaries } from '@/lib/db/questions';
import { questionInput, saveQuestion } from '@/lib/db/question-input';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const p = new URL(req.url).searchParams;
    const items = await listQuestionSummaries({ status: p.get('status') ?? undefined, format: p.get('format') ?? undefined, category: p.get('category') ?? undefined, search: p.get('q') ?? undefined });
    const categories = await prisma.question.groupBy({ by: ['category'], _count: true, orderBy: { category: 'asc' } });
    return ok({ items, categories: categories.map((c) => ({ name: c.category, count: c._count })) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const input = questionInput.parse(await req.json());
    const id = await saveQuestion(input);
    return ok({ id }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
