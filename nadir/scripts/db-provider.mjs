#!/usr/bin/env node
/** Switches prisma/schema.prisma between sqlite and postgresql. Usage: node scripts/db-provider.mjs postgresql */
import fs from 'node:fs';
const target = process.argv[2];
if (!['sqlite', 'postgresql'].includes(target)) {
  console.error('Usage: node scripts/db-provider.mjs <sqlite|postgresql>');
  process.exit(1);
}
const file = new URL('../prisma/schema.prisma', import.meta.url);
const schema = fs.readFileSync(file, 'utf8');
const updated = schema.replace(/provider = "(sqlite|postgresql)"/, `provider = "${target}"`);
fs.writeFileSync(file, updated);
console.log(`prisma/schema.prisma now uses provider = "${target}". Run: npx prisma migrate dev (local) or npx prisma migrate deploy (production).`);
