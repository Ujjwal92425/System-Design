/**
 * apps/backend/src/middleware/authenticate.ts
 *
 * JWT access token verification middleware.
 *
 * Strategy:
 *   1. Extract Bearer token from Authorization header
 *   2. Verify signature using JWT_SECRET
 *   3. Attach decoded payload to req.user
 *   4. Throw 401 if missing / expired / tampered
 *
 * Security notes:
 *   - Access tokens are short-lived (15m) — expiry is enforced by jwt.verify
 *   - We do NOT check a revocation list on every request (too slow).
 *     Revocation is handled at the refresh token layer (usersRepo.revokeRefreshToken).
 *   - On 401, clients must call POST /api/auth/refresh to get a new access token.
 *
 * Usage:
 *   // Protect a single route
 *   router.get('/me', authenticate, handler)
 *
 *   // Protect an entire sub-router
 *   app.use('/api/designs', authenticate, designsRouter)
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

/** JWT payload shape minted by authService.login() */
export interface AccessTokenPayload extends JwtPayload {
  sub:  string; // userId (cuid)
  role: string; // Role enum value
}

/** Extends Express Request with the verified user identity */
export interface AuthRequest extends Request {
  user?: {
    id:   string;
    role: string;
  };
}

/**
 * Strict middleware — throws 401 if token is absent or invalid.
 * Use this on routes that always require authentication.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(
      'UNAUTHORIZED',
      'Authorization header is missing or malformed. Expected: "Bearer <token>"',
      401
    ));
  }

  const token = authHeader.slice(7); // Strip "Bearer " prefix

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    if (!payload.sub || !payload.role) {
      return next(new AppError('UNAUTHORIZED', 'Token payload is malformed', 401));
    }

    req.user = {
      id:   payload.sub,
      role: payload.role,
    };

    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(
        'TOKEN_EXPIRED',
        'Access token has expired. Please refresh your session.',
        401
      ));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError(
        'INVALID_TOKEN',
        'Access token signature is invalid.',
        401
      ));
    }
    return next(new AppError('UNAUTHORIZED', 'Authentication failed', 401));
  }
}

/**
 * Optional middleware — attaches user if token is present but does NOT throw
 * if token is absent. Useful for routes that work for both guests and users.
 */
export function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(); // Guest — no user attached
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    if (payload.sub && payload.role) {
      req.user = { id: payload.sub, role: payload.role };
    }
  } catch {
    // Silently ignore invalid token in optional mode
  }

  return next();
}
