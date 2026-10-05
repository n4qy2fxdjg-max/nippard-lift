import { cookies } from 'next/headers';
import { HttpError } from './http';

export const ADMIN_COOKIE = 'nadir_admin';

export function adminPasswordConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export async function isAdmin(): Promise<boolean> {
  if (!adminPasswordConfigured()) return true;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === process.env.ADMIN_PASSWORD;
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new HttpError(401, 'Admin sign-in required', 'ADMIN_REQUIRED');
}
