import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminPasswordConfigured } from '@/lib/util/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!adminPasswordConfigured()) return NextResponse.json({ ok: true, open: true });
  if (password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, password, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === 'production' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
