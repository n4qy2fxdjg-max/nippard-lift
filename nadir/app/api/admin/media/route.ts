import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/util/auth';
import { fail, HttpError, ok } from '@/lib/util/http';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 1_500_000;

/**
 * Media upload. Files are stored as data URLs in the database so the same code runs on
 * serverless hosts without a writable filesystem; swap for blob storage by changing `url`.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError(400, 'No file uploaded');
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$|^audio\//.test(file.type)) throw new HttpError(400, 'Unsupported file type');
    if (file.size > MAX_BYTES) throw new HttpError(400, `File too large (max ${Math.round(MAX_BYTES / 1024)} KB). Resize the image first.`);
    const buf = Buffer.from(await file.arrayBuffer());
    const url = `data:${file.type};base64,${buf.toString('base64')}`;
    const asset = await prisma.mediaAsset.create({ data: { url, mimeType: file.type, kind: file.type.startsWith('audio') ? 'AUDIO' : file.type.includes('svg') ? 'SVG' : 'IMAGE', alt: String(form.get('alt') ?? file.name) } });
    return ok({ id: asset.id, url: asset.url }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, url: true, kind: true, alt: true, createdAt: true } });
    return ok(assets);
  } catch (e) {
    return fail(e);
  }
}
