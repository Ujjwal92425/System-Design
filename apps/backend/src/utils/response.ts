/**
 * apps/backend/src/utils/response.ts
 *
 * Standard response helpers — all API responses go through these functions.
 * Enforces the { success, data, meta?, requestId? } envelope format.
 *
 * Never call res.json() directly in controllers — always use these helpers.
 */

import { Response } from 'express';

/**
 * Successful response.
 *
 * @param res        Express Response object
 * @param data       Payload to send (will be nested under "data")
 * @param statusCode HTTP status code (default 200)
 * @param meta       Optional pagination or extra metadata
 *
 * Shape:
 *   { "success": true, "data": {...}, "meta": { "page": 1, "total": 100 } }
 */
export function success(
  res: Response,
  data: unknown,
  statusCode: number = 200,
  meta?: Record<string, unknown>
): Response {
  const body: Record<string, unknown> = { success: true, data };
  if (meta && Object.keys(meta).length > 0) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

/**
 * Paginated list response.
 *
 * Automatically builds the meta block from pagination parameters.
 *
 * @param res    Express Response object
 * @param items  Array of items for the current page
 * @param total  Total number of items across all pages
 * @param page   Current page number (1-indexed)
 * @param limit  Items per page
 *
 * Shape:
 *   {
 *     "success": true,
 *     "data": { "items": [...] },
 *     "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8, "hasNext": true }
 *   }
 */
export function paginated(
  res: Response,
  items: unknown[],
  total: number,
  page: number,
  limit: number
): Response {
  const totalPages = Math.ceil(total / limit);
  return success(res, { items }, 200, {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  });
}

/**
 * Created response — 201 with the created resource.
 */
export function created(res: Response, data: unknown): Response {
  return success(res, data, 201);
}

/**
 * No content response — 204 (used for DELETE).
 * Note: 204 sends no body.
 */
export function noContent(res: Response): Response {
  return res.status(204).send();
}
