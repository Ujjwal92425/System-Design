/**
 * apps/backend/src/middleware/authorize.ts
 *
 * Role-Based Access Control (RBAC) middleware.
 *
 * Usage:
 *   // Only ADMINs can access
 *   router.get('/admin/users', authenticate, authorize(['ADMIN']), handler)
 *
 *   // PRO or ADMIN can access
 *   router.post('/ai/analyze', authenticate, authorize(['PRO', 'ADMIN']), handler)
 *
 * Note: `authenticate` must run before `authorize` — it populates req.user.
 *
 * Role hierarchy (for reference — enforced by explicit allow-lists, not hierarchy):
 *   ADMIN > INSTRUCTOR > PRO > USER
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { AppError } from '../utils/errors';

type AllowedRole = 'USER' | 'PRO' | 'INSTRUCTOR' | 'ADMIN';

/**
 * Returns middleware that blocks requests whose role is not in `allowedRoles`.
 *
 * @param allowedRoles  Array of roles permitted to access the route.
 *                      Pass an empty array to block all (useful for disabling a route).
 */
export function authorize(allowedRoles: AllowedRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    // Defensive: authenticate should have run first
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Not authenticated', 401));
    }

    const userRole = req.user.role as AllowedRole;

    // ADMIN always passes — they have access to everything
    if (userRole === 'ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError(
        'FORBIDDEN',
        `This action requires one of the following roles: ${allowedRoles.join(', ')}. ` +
        `Your current role is: ${userRole}.`,
        403
      ));
    }

    return next();
  };
}

/**
 * Convenience guard — only the resource owner OR an admin may proceed.
 *
 * Usage:
 *   router.delete('/designs/:id', authenticate, authorizeOwner('design'), handler)
 *
 * The route handler is responsible for fetching the resource and verifying
 * that `resource.userId === req.user.id` (this middleware can't know the
 * resource upfront without an extra DB call).
 *
 * This is a lightweight guard that just ensures the user is authenticated
 * and not trying to modify a resource as a total stranger.
 */
export function authorizeOwner(resourceType: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Not authenticated', 401));
    }
    const resourceUserId = (req as any)._ownerUserId;
    if (resourceUserId && resourceUserId !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AppError(
        'FORBIDDEN',
        `You do not own this ${resourceType}`,
        403
      ));
    }
    return next();
  };
}
