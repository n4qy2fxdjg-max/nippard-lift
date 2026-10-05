import { NextRequest } from 'next/server';
import { z } from 'zod';
import { publishSurvey } from '@/lib/survey';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = z.object({ category: z.string().max(60).optional(), status: z.enum(['DRAFT', 'READY']).optional() }).parse(await req.json().catch(() => ({})));
    const questionId = await publishSurvey(id, body);
    return ok({ questionId });
  } catch (e) {
    return fail(e);
  }
}
