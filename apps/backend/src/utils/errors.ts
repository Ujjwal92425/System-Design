/**
 * apps/backend/src/utils/errors.ts
 *
 * Central error class for all known application errors.
 * All errors must carry:
 *   - `code`       — machine-readable string (used in API response + monitoring)
 *   - `statusCode` — HTTP status code
 *   - `message`    — human-readable description (shown in dev; scrubbed in prod for 5xx)
 *   - `details`    — optional structured data (e.g. Zod validation field errors)
 *
 * NEVER throw raw `Error` objects from service/controller code.
 * All unhandled errors are caught by the global errorHandler middleware.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details: unknown = null
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    // Operational errors are expected (validation, auth, not-found).
    // Non-operational (5xx, crashes) get logged differently.
    this.isOperational = statusCode < 500;

    // Maintains proper prototype chain for `instanceof` checks in TS
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture a clean stack trace (excludes the constructor itself)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Typed factory shortcuts ──────────────────────────────────────────────────
// Use these for common cases to keep call-sites concise.

export const Errors = {
  notFound:   (resource: string)          => new AppError('NOT_FOUND', `${resource} not found`, 404),
  unauthorized: (msg = 'Not authenticated') => new AppError('UNAUTHORIZED', msg, 401),
  forbidden:   (msg = 'Access denied')     => new AppError('FORBIDDEN', msg, 403),
  conflict:    (msg: string)               => new AppError('CONFLICT', msg, 409),
  validation:  (msg: string, details?: unknown) =>
    new AppError('VALIDATION_ERROR', msg, 422, details),
  tooMany:     (msg = 'Too many requests') => new AppError('RATE_LIMIT_EXCEEDED', msg, 429),
  internal:    (msg = 'Internal server error') => new AppError('INTERNAL_SERVER_ERROR', msg, 500),
} as const;
