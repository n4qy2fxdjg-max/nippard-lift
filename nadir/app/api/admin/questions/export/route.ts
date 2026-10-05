import { NextRequest, NextResponse } from 'next/server';
import { exportQuestions, toCsv } from '@/lib/db/import-export';
import { requireAdmin } from '@/lib/util/auth';
import { fail } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const p = new URL(req.url).searchParams;
    const ids = p.get('ids')?.split(',').filter(Boolean);
    const data = await exportQuestions(ids);
    if (p.get('format') === 'csv') return new NextResponse(toCsv(data), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="nadir-questions.csv"' } });
    return new NextResponse(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), questions: data }, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="nadir-questions.json"' } });
  } catch (e) {
    return fail(e);
  }
}
