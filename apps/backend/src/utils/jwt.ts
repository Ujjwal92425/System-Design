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
import { env } from '../config/env';

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
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
