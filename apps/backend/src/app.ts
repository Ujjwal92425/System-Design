/**
 * apps/backend/src/app.ts
 *
 * Express application entry point.
 *
 * Middleware registration order (ORDER MATTERS in Express):
 *   1. Security headers (Helmet)
 *   2. CORS
 *   3. Body parsers
 *   4. Request logger + requestId attachment
 *   5. Global rate limiter (100 req/min per IP)
 *   6. Public routes (auth — no token required)
 *   7. JWT authentication (all /api/* routes)
 *   8. Feature routers
 *   9. 404 handler
 *  10. Global error handler (must be last)
 *
 * Security hardening applied:
 *   - Helmet sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options
 *   - CORS restricted to FRONTEND_URL with credentials
 *   - Body size capped at 2mb (design JSON can be large but not huge)
 *   - Sensitive routes have their own tighter rate limiters
 */

import 'dotenv/config'; // Must be first
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { rateLimit } from './middleware/rateLimit';
import { authenticate } from './middleware/authenticate';
import { errorHandler } from './middleware/errorHandler';

// ── Feature Routers ──────────────────────────────────────────────────────────
import { authRouter }      from './modules/auth/auth.router';
import { usersRouter }     from './modules/users/users.router';
import { learnRouter }     from './modules/learn/tracks.router';
import { designsRouter }   from './modules/designs/designs.router';
import { simulationRouter } from './modules/simulation/simulation.router';
import { interviewRouter } from './modules/interview/interview.router';
import { communityRouter } from './modules/community/blueprints.router';
import { aiRouter }        from './modules/ai/ai.router';
import { usageRouter }     from './modules/usage/usage.router';
import { billingRouter }   from './modules/billing/billing.router';
import { adminRouter }     from './modules/admin/admin.router';

// ── Background Job Workers (self-registering) ────────────────────────────────
// These files import themselves and register BullMQ workers on startup.
import './jobs/ai-analysis.job';
import './jobs/email.job';

// ─────────────────────────────────────────────────────────────────────────────
const app = express();

// ── 1. Security Headers ───────────────────────────────────────────────────────
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", env.FRONTEND_URL],
        frameSrc:   ["'none'"],
        objectSrc:  ["'none'"],
      },
    },
    // HTTP Strict Transport Security — 1 year, include subdomains
    hsts: {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    },
    // Prevent MIME sniffing
    noSniff: true,
    // Prevent clickjacking
    frameguard: { action: 'deny' },
    // Remove X-Powered-By: Express
    hidePoweredBy: true,
  })
);

// ── 2. CORS ───────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin:      env.FRONTEND_URL,
    credentials: true, // Required for HttpOnly cookie auth
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  })
);

// ── 3. Body Parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── 4. Request Logger (attaches requestId) ────────────────────────────────────
app.use(requestLogger);

// ── 5. Global Rate Limiter ────────────────────────────────────────────────────
// 100 requests per minute per IP across all endpoints
app.use(rateLimit({ requests: 100, window: '1m' }));

// ── Health Check (no auth, no rate limit — used by Render uptime ping) ────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    env:       env.NODE_ENV,
  });
});

// ── 6. Public Routes (auth) ───────────────────────────────────────────────────
// Auth endpoints have their OWN stricter rate limiters (5 req / 15 min)
// defined inside auth.router.ts — no global limiter override needed here.
app.use('/api/auth', authRouter);

// ── 7–8. Authenticated Routes ─────────────────────────────────────────────────
// All routes below require a valid JWT access token.
// authenticate middleware throws 401 if the token is missing or expired.
// The frontend then silently refreshes via POST /api/auth/refresh.
app.use('/api/users',     authenticate, usersRouter);
app.use('/api/learn',     authenticate, learnRouter);
app.use('/api/designs',    authenticate, designsRouter);
app.use('/api/simulation', authenticate, simulationRouter);
app.use('/api/usage',      authenticate, usageRouter);
app.use('/api/interview',  authenticate, interviewRouter);
app.use('/api/community', authenticate, communityRouter);
app.use('/api/ai',        authenticate, aiRouter);
app.use('/api/billing',   authenticate, billingRouter);
app.use('/api/admin',     authenticate, adminRouter);

// ── 9. 404 Handler ────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code:    'NOT_FOUND',
      message: `Route ${_req.method} ${_req.path} does not exist.`,
    },
  });
});

// ── 10. Global Error Handler (MUST BE LAST) ───────────────────────────────────
app.use(errorHandler);

// ─── WebSocket / Collab Server ────────────────────────────────────────────────
// Socket.io attaches to the same HTTP server for real-time collaboration.
import { initSocketServer } from './ws/socketServer';

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(
    { port: PORT, env: env.NODE_ENV, pid: process.pid },
    `🚀 SD-OS API running on port ${PORT}`
  );
  // Initialize WebSocket server after HTTP server starts
  initSocketServer(server);
  logger.info('WebSocket server attached');
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// On SIGTERM (Render graceful shutdown), stop accepting new connections and
// let in-flight requests finish (30s timeout) before exiting.
const gracefulShutdown = (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received — starting graceful shutdown');

  server.close(() => {
    logger.info('HTTP server closed — process exiting');
    process.exit(0);
  });

  // Force exit after 30s if requests don't finish
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 30_000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Catch unhandled promise rejections — log and exit (let process manager restart)
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection — exiting');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

export default app;
