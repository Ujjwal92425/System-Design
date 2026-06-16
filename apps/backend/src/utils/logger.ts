/**
 * apps/backend/src/utils/logger.ts
 *
 * Structured JSON logger built on Pino.
 *
 * Conventions:
 *   - Always log with a context object as the first arg:
 *       logger.info({ userId, designId }, 'Design saved')
 *   - Never log passwords, tokens, or PII in plain text
 *   - Use `logger.child({ requestId })` in request middleware for correlation
 *
 * In development: pino-pretty gives colored, human-readable output.
 * In production:  pure JSON → shipped to log aggregator (Datadog, Logtail, etc.)
 *
 * Log levels:
 *   trace  — fine-grained DB queries (dev only)
 *   debug  — internal state, token rotation, cache hits
 *   info   — normal operations (user login, design saved)
 *   warn   — recoverable issues (rate limit hit, email not found)
 *   error  — unhandled exceptions that need investigation
 *   fatal  — process is about to die
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  // Minimum level to emit — can be overridden per-environment
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Standard fields added to every log line
  base: {
    env: process.env.NODE_ENV || 'development',
    pid: process.pid,
  },

  // ISO timestamp string (more readable than epoch in aggregators)
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive fields if they accidentally appear in log objects
  // These are replaced with "[Redacted]" in all log output
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      'authorization',
      'cookie',
      'verificationToken',
      'resetToken',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.verificationToken',
      '*.resetToken',
      '*.refreshToken',
      '*.accessToken',
    ],
    censor: '[Redacted]',
  },

  // Pretty-print in development (requires pino-pretty installed)
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,env',
        messageFormat: '{msg} {if requestId}[{requestId}]{end}',
      },
    },
  }),
});

/**
 * Create a child logger with request-scoped context.
 * Use inside request middleware so every log line carries requestId + userId.
 *
 * Example:
 *   const reqLogger = createRequestLogger(req.id, req.user?.id)
 *   reqLogger.info('Processing design save')
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    ...(userId && { userId }),
  });
}
