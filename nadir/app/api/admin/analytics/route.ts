import { computeAnalytics } from '@/lib/db/analytics';
import { requireAdmin } from '@/lib/util/auth';
import { fail, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    return ok(await computeAnalytics());
  } catch (e) {
    return fail(e);
  }
}
