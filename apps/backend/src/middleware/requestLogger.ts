/**
 * apps/backend/src/middleware/requestLogger.ts
 *
 * Per-request structured logging middleware.
 *
 * Attaches a unique requestId (UUID v4) to every request and logs:
 *   - START: method, path, IP, user-agent
 *   - END:   status code, duration in ms
 *
 * The requestId is also set in the response header so clients/frontend
 * can include it in bug reports.
 *
 * Usage in app.ts:
 *   app.use(requestLogger);
 */

import { Request, Response, NextFunction } from 'express';
import { createRequestLogger } from '../utils/logger';

/** Simple UUID v4 generator — no external dependency */
function generateRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Attach requestId so errorHandler and other middleware can read it
  (req as any).id = requestId;

  // Expose to client for correlation
  res.setHeader('X-Request-Id', requestId);

  // Child logger scoped to this request
  const reqLog = createRequestLogger(requestId, (req as any).user?.id);

  // Log incoming request
  reqLog.debug(
    {
      method:    req.method,
      path:      req.path,
      query:     Object.keys(req.query).length ? req.query : undefined,
      ip:        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip,
      userAgent: req.headers['user-agent'],
    },
    `→ ${req.method} ${req.path}`
  );

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level    = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'info';

    reqLog[level](
      { statusCode: res.statusCode, durationMs: duration },
      `← ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}
