import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma's generated client and the native SQLite driver must stay out of the bundler.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-better-sqlite3', 'better-sqlite3', 'pg'],
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: false },
  turbopack: { root: process.cwd() },
  agentRules: false,
};

export default nextConfig;
