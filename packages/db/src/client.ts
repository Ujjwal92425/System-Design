/**
 * packages/db/src/client.ts
 *
 * PrismaClient singleton — prevents multiple client instances in development
 * due to Next.js hot-reload creating a new module scope on each file change.
 *
 * Pattern: store client on `globalThis` in dev, instantiate fresh in prod.
 *
 * Security: DATABASE_URL is validated by the backend's env.ts before this
 * module is ever imported — fail fast on startup, not at runtime.
 */

import { PrismaClient } from '@prisma/client';

const logConfig: ('query' | 'info' | 'warn' | 'error')[] =
  process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'];

// ─── Singleton factory ────────────────────────────────────────────────────────
function createPrismaClient() {
  return new PrismaClient({
    log: logConfig,
    errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'colorless',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Extend globalThis typing to avoid TypeScript complaints
declare global {
  // eslint-disable-next-line no-var
  var __prisma: ReturnType<typeof createPrismaClient> | undefined;
}

/**
 * The single shared PrismaClient instance.
 *
 * Usage:
 *   import { db } from '@sd-os/db'
 *   const user = await db.user.findUnique({ where: { id } })
 */
export const db: ReturnType<typeof createPrismaClient> =
  globalThis.__prisma ?? createPrismaClient();

// In development, attach to global to survive hot-reloads
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = db;
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Ensures connections are cleanly closed when the process exits.
// Critical for preventing connection pool exhaustion on Render free tier.
process.on('beforeExit', async () => {
  await db.$disconnect();
});
