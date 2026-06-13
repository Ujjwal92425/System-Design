/**
 * apps/backend/src/utils/jwt.ts
 *
 * JWT token verification utility shared between HTTP middleware
 * and WebSocket authentication.
 *
 * CHANGE: New file — extracted from authenticate.ts for reuse
 *          in WebSocket collab server.
 */

import jwt, { type JwtPayload } from 'jsonwebtoken';

export interface TokenPayload extends JwtPayload {
  sub: string;
  role: string;
  name?: string;
}

/**
 * Verify a JWT access token and return the decoded payload.
 * Throws on invalid signature or expired token.
 */
export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, secret) as TokenPayload;
}
