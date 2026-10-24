/**
 * apps/backend/src/middleware/errorHandler.ts
 *
 * Central error handler — must be the LAST middleware registered in app.ts.
 * All errors thrown anywhere in the request lifecycle end up here.
 *
 * Response format (always JSON, always consistent):
 *   {
 *     "success": false,
 *     "error": {
 *       "code":    "VALIDATION_ERROR",
 *       "message": "Request body validation failed",
 *       "details": { "email": "Invalid email address format" }  // dev only
 *     }
 *   }
 *
 * Classification:
 *   - AppError (isOperational=true)  → structured, expected, 4xx
 *   - AppError (isOperational=false) → our own 5xx — log but mask message
 *   - Unknown Error                  → unexpected — log full stack, return 500
 *
 * Security:
 *   - Stack traces are NEVER returned to clients in production
 *   - 5xx messages are replaced with a generic string
 *   - requestId is always echoed back for correlation
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { isProd } from '../config/env';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const requestId = (req as any).id ?? 'unknown';
  const method    = req.method;
  const path      = req.path;

  // ── Known operational error (AppError) ──────────────────────────────────────
  if (err instanceof AppError) {
    if (err.isOperational) {
      logger.warn(
        { code: err.code, statusCode: err.statusCode, requestId, method, path },
        err.message
      );
    } else {
      logger.error(
        { err, requestId, method, path },
        `Non-operational AppError: ${err.message}`
      );
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code:    err.code,
        message: err.statusCode >= 500 && isProd
          ? 'An internal error occurred. Our team has been notified.'
          : err.message,
        ...((err.details && !isProd) ? { details: err.details } : {}),
      },
      requestId,
    });
  }

  // ── Unknown / unexpected error ───────────────────────────────────────────────
  const unknownErr = err instanceof Error ? err : new Error(String(err));
  const errName = unknownErr.name || '';
  const errMsg = unknownErr.message || '';

  // CHANGE: Detect Prisma and PostgreSQL database connection or pooler reachability issues
  const isDbError =
    errName.includes('Prisma') ||
    errMsg.includes("Can't reach database server") ||
    errMsg.includes('Connection terminated') ||
    (unknownErr as any).code === 'P1001' ||
    (unknownErr as any).code === 'P1002';

  if (isDbError) {
    logger.error(
      { err: unknownErr, requestId, method, path, stack: unknownErr.stack },
      'Database connection failure encountered'
    );

    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database service is temporarily unreachable. Please check your connection or try again in a few moments.',
        ...(!isProd ? { details: { originalError: unknownErr.message } } : {}),
      },
      requestId,
    });
  }

  logger.error(
    { err: unknownErr, requestId, method, path, stack: unknownErr.stack },
    'Unhandled exception — this should not happen in production'
  );

  // CHANGE: In dev mode, strip raw filesystem paths from primary message so UI doesn't leak code paths
  const userSafeMessage = isProd
    ? 'An unexpected error occurred. Please try again later.'
    : (errMsg.includes('C:\\') || errMsg.includes('/') || errMsg.includes('\n'))
      ? 'An unexpected internal error occurred. See details or server logs.'
      : errMsg;

  return res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_SERVER_ERROR',
      message: userSafeMessage,
      ...(!isProd ? { details: { originalError: unknownErr.message }, stack: unknownErr.stack } : {}),
    },
    requestId,
  });
}

