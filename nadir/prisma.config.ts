import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

const isPostgres = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    // SQLite and PostgreSQL need different migration SQL, so each has its own folder.
    path: isPostgres ? 'prisma/migrations-pg' : 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
