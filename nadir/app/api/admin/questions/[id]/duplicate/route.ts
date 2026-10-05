import { NextRequest } from 'next/server';
import { readQuestionInput, saveQuestion } from '@/lib/db/question-input';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const q = await readQuestionInput(id);
    const copy = await saveQuestion({ ...q, format: q.format as never, status: 'DRAFT', text: `${q.text} (copy)`, answers: q.answers.map(({ id: _i, ...a }) => a), boardItems: q.boardItems.map(({ id: _i, ...b }) => b) } as never);
    return ok({ id: copy }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
