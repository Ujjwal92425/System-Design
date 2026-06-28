/**
 * apps/backend/src/middleware/rateLimit.ts
 *
 * In-memory sliding-window rate limiter.
 *
 * Why in-memory vs Redis?
 *   For a single-process API (Render free tier), in-memory is simpler and
 *   has zero cold-start penalty. When scaling to multiple instances, swap
 *   the store for ioredis INCR + EXPIRE to share counters across pods.
 *
 * Design:
 *   - Each IP gets a bucket: { count, windowEnd }
 *   - On every request, if windowEnd has passed, reset the bucket
 *   - If count exceeds limit, respond 429 with Retry-After header
 *
 * Usage:
 *   rateLimit({ requests: 5, windowMs: 15 * 60 * 1000 })   // 5 req / 15 min
 *   rateLimit({ requests: 100, windowMs: 60 * 1000 })       // 100 req / 1 min
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  requests: number;
  /** Window duration in milliseconds OR shorthand string ("15m", "1h", "30s") */
  windowMs?: number;
  /** Convenience shorthand — used if windowMs is omitted */
  window?: string;
  /** Custom error message */
  message?: string;
}

interface Bucket {
  count: number;
  windowEnd: number;
}

/** Parse shorthand window strings like "15m", "1h", "30s" into milliseconds */
function parseWindowMs(raw: string | undefined, fallbackMs: number): number {
  if (!raw) return fallbackMs;
  const match = raw.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return fallbackMs;
  const value = parseInt(match[1], 10);
  const unit  = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s:           1_000,
    m:      60 * 1_000,
    h: 3_600 * 1_000,
    d: 86_400 * 1_000,
  };
  return value * (multipliers[unit] ?? fallbackMs);
}

/** Per-IP bucket store — one Map per rate-limit middleware instance */
function createLimiter(options: RateLimitOptions) {
  const windowMs = options.windowMs ?? parseWindowMs(options.window, 60_000);
  const store    = new Map<string, Bucket>();

  // Periodically purge expired buckets to prevent memory growth (every 5 min)
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    store.forEach((bucket, key) => {
      if (now > bucket.windowEnd) store.delete(key);
    });
  }, 5 * 60 * 1_000);

  // Allow Node to exit even if interval is pending
  sweepInterval.unref?.();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    // Use X-Forwarded-For if behind a trusted proxy (Render/Vercel set this)
    const ip  = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
              || req.ip
              || 'unknown';
    const now = Date.now();

    let bucket = store.get(ip);

    // First request or window has expired — create/reset bucket
    if (!bucket || now > bucket.windowEnd) {
      bucket = { count: 1, windowEnd: now + windowMs };
      store.set(ip, bucket);
      return next();
    }

    bucket.count++;

    if (bucket.count > options.requests) {
      const retryAfterSec = Math.ceil((bucket.windowEnd - now) / 1_000);

      // Standard RFC 6585 headers
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit',     options.requests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset',     Math.ceil(bucket.windowEnd / 1_000));

      return next(new AppError(
        'RATE_LIMIT_EXCEEDED',
        options.message ?? `Too many requests. Please wait ${retryAfterSec}s before retrying.`,
        429
      ));
    }

    // Set informational headers for well-behaved clients
    res.setHeader('X-RateLimit-Limit',     options.requests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.requests - bucket.count));
    res.setHeader('X-RateLimit-Reset',     Math.ceil(bucket.windowEnd / 1_000));

    return next();
  };
}

/**
 * Factory — creates a rate-limit middleware.
 *
 * Examples:
 *   rateLimit({ requests: 5, window: '15m' })   // auth routes
 *   rateLimit({ requests: 100, window: '1m' })   // global
 *   rateLimit({ requests: 10, window: '1h' })    // AI endpoints
 */
export function rateLimit(options: RateLimitOptions) {
  return createLimiter(options);
}
