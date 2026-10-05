import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { questionInput, readQuestionInput, saveQuestion } from '@/lib/db/question-input';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    return ok(await readQuestionInput(id));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = questionInput.parse(await req.json());
    await saveQuestion(input, id);
    return ok(await readQuestionInput(id));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const used = await prisma.roundQuestion.count({ where: { questionId: id } });
    if (used > 0) {
      await prisma.question.update({ where: { id }, data: { status: 'ARCHIVED' } });
      return ok({ archived: true, reason: 'Question has been used in a game; archived instead of deleted.' });
    }
    await prisma.question.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
