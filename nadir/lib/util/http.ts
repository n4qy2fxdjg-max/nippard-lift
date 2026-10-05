import { NextResponse } from 'next/server';
import { EngineError } from '@/lib/game-engine/types';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'ERROR') {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof EngineError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
  if (error && typeof error === 'object' && 'issues' in error) return NextResponse.json({ error: 'Invalid input', code: 'VALIDATION', issues: (error as { issues: unknown }).issues }, { status: 400 });
  console.error(error);
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error', code: 'INTERNAL' }, { status: 500 });
}

export function appUrl(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  return `${proto}://${host}`;
}
