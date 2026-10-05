import { PrismaClient } from '@/lib/generated/prisma/client';
import { createRequire } from 'node:module';
import { PrismaPg } from '@prisma/adapter-pg';
import path from 'node:path';

declare global {
  // eslint-disable-next-line no-var
  var __nadirPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  // Loaded lazily so a PostgreSQL deployment never needs the native SQLite driver.
  const { PrismaBetterSqlite3 } = createRequire(import.meta.url)('@prisma/adapter-better-sqlite3') as typeof import('@prisma/adapter-better-sqlite3');
  // Resolve the SQLite file relative to the project root so API routes and scripts agree.
  const file = url.replace(/^file:/, '');
  const absolute = file === ':memory:' ? file : path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: absolute === ':memory:' ? absolute : `file:${absolute}` }) });
}

export const prisma: PrismaClient = globalThis.__nadirPrisma ?? createClient();
if (process.env.NODE_ENV !== 'production') globalThis.__nadirPrisma = prisma;

export const json = {
  parse<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  },
  stringify(value: unknown): string {
    return JSON.stringify(value);
  },
};
