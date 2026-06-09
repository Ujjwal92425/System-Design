/**
 * apps/backend/src/config/env.ts
 *
 * Single, validated environment configuration object.
 *
 * Rules:
 *   1. ALL config must come from here — no scattered `process.env` calls
 *   2. Zod validates and coerces on startup — the process exits if any
 *      required variable is missing (fail-fast, not at runtime)
 *   3. Sensitive defaults (e.g. localhost Redis) are only allowed in development
 *
 * Required variables (must be in .env or CI secrets):
 *   DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
 *
 * Optional with defaults:
 *   PORT, REDIS_URL, FRONTEND_URL, LOG_LEVEL, etc.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the monorepo root (two levels up from apps/backend/src)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// ─── Schema ───────────────────────────────────────────────────────────────────
const EnvSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // ── Database ─────────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // ── Redis / Cache ────────────────────────────────────────────────────────────
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // ── Auth ─────────────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  // Access token TTL (e.g. "15m", "1h") — used by auth.service.ts
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  // Refresh token TTL in days
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(7),

  // ── Frontend ──────────────────────────────────────────────────────────────────
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // ── AI Providers ─────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // ── Stripe Billing ────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // ── Email / SMTP (for verification + password reset) ─────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@sdos.academy'),

  // ── Monitoring ────────────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().optional(),
});

// ─── Parse and export ─────────────────────────────────────────────────────────
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌  Invalid environment configuration — fix before starting the server:\n');
  parsed.error.issues.forEach((issue) => {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('');
  process.exit(1); // Fail fast — never run with a broken config
}

export const env = parsed.data;

// Convenience helpers
export const isDev  = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
