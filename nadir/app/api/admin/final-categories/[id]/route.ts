import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';
import { categorySchema } from '../route';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const input = categorySchema.parse(await req.json());
    await prisma.$transaction([
      prisma.finalPrompt.deleteMany({ where: { categoryId: id } }),
      prisma.finalCategory.update({ where: { id }, data: { title: input.title, description: input.description, status: input.status, prompts: { create: input.questionIds.map((qid, i) => ({ questionId: qid, sortOrder: i })) } } }),
    ]);
    return ok({ id });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.finalCategory.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return fail(e);
  }
}
