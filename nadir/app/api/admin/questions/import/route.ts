import { NextRequest } from 'next/server';
import { fromCsv, importQuestions } from '@/lib/db/import-export';
import { requireAdmin } from '@/lib/util/auth';
import { fail, HttpError, ok } from '@/lib/util/http';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const contentType = req.headers.get('content-type') ?? '';
    let items: unknown[];
    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      items = fromCsv(await req.text());
    } else {
      const body = await req.json();
      if (typeof body === 'object' && body && 'csv' in body) items = fromCsv(String((body as { csv: string }).csv));
      else items = Array.isArray(body) ? body : Array.isArray((body as { questions?: unknown[] }).questions) ? (body as { questions: unknown[] }).questions : [];
    }
    if (!items.length) throw new HttpError(400, 'Nothing to import');
    return ok(await importQuestions(items));
  } catch (e) {
    return fail(e);
  }
}
