/**
 * apps/backend/src/middleware/validate.ts
 *
 * Zod validation middleware for Express route bodies, query params, and params.
 *
 * Design decisions:
 *   - `parseAsync` used (not `parse`) to support async Zod refinements
 *   - Validation errors are passed to `next(err)` — caught by errorHandler
 *   - Field-level error details are included in the response in dev only
 *   - Body, query, and params can be validated independently or together
 *
 * Usage:
 *   // Validate body only
 *   router.post('/signup', validate(SignupBody), handler)
 *
 *   // Validate body + query params
 *   router.get('/lessons', validateAll({ query: SearchQuery }), handler)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { isDev } from '../config/env';

/** Format Zod errors into a user-friendly { field: message } map */
function formatZodErrors(err: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  err.issues.forEach((issue) => {
    const field = issue.path.join('.') || 'root';
    result[field] = issue.message;
  });
  return result;
}

/**
 * Validate `req.body` against the given Zod schema.
 * Mutates `req.body` with the parsed (coerced + trimmed) output.
 */
export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await schema.safeParseAsync(req.body);
    if (!result.success) {
      const fieldErrors = formatZodErrors(result.error);
      return next(new AppError(
        'VALIDATION_ERROR',
        'Request body validation failed',
        422,
        isDev ? fieldErrors : undefined // hide field details in production
      ));
    }
    // Overwrite body with parsed output (Zod coercion + .trim() applied)
    req.body = result.data;
    return next();
  };
}

/**
 * Validate query params against the given Zod schema.
 * Mutates `req.query` with the parsed output.
 */
export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await schema.safeParseAsync(req.query);
    if (!result.success) {
      const fieldErrors = formatZodErrors(result.error);
      return next(new AppError(
        'VALIDATION_ERROR',
        'Query parameter validation failed',
        422,
        isDev ? fieldErrors : undefined
      ));
    }
    // Express types req.query as ParsedQs — cast needed
    (req as any).query = result.data;
    return next();
  };
}

/**
 * Validate route params against the given Zod schema.
 * Useful for enforcing cuid/uuid format on :id params.
 */
export function validateParams(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await schema.safeParseAsync(req.params);
    if (!result.success) {
      const fieldErrors = formatZodErrors(result.error);
      return next(new AppError(
        'VALIDATION_ERROR',
        'Route parameter validation failed',
        422,
        isDev ? fieldErrors : undefined
      ));
    }
    req.params = result.data;
    return next();
  };
}
