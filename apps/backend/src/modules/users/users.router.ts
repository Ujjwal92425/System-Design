/**
 * apps/backend/src/modules/users/users.router.ts
 *
 * User profile endpoints — all require authentication.
 * Mounted at: /api/users
 *
 * Routes:
 *   GET    /api/users/profile          → own profile + subscription
 *   PATCH  /api/users/profile          → update name/bio/avatar
 *   PATCH  /api/users/password         → change password
 *   DELETE /api/users/account          → initiate account deletion
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { success } from '../../utils/response';
import { usersService } from './users.service';
import { UpdateProfileBody, ChangePasswordBody } from './users.schema';
import { AppError } from '../../utils/errors';

export const usersRouter = Router();

// All user routes require a valid access token
usersRouter.use(authenticate);

// ─── GET /api/users/profile ────────────────────────────────────────────────
usersRouter.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const profile = await usersService.getProfile(req.user!.id);
    success(res, { profile });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/users/profile ──────────────────────────────────────────────
usersRouter.patch('/profile', validate(UpdateProfileBody), async (req: AuthRequest, res, next) => {
  try {
    const { name, bio, avatarUrl } = req.body;
    const profile = await usersService.updateProfile(req.user!.id, { name, bio, avatarUrl });
    success(res, { profile });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/users/password ─────────────────────────────────────────────
usersRouter.patch('/password', validate(ChangePasswordBody), async (req: AuthRequest, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await usersService.changePassword(
      req.user!.id,
      currentPassword,
      newPassword
    );
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/users/account ─────────────────────────────────────────────
// Requires the user to confirm with their password before deletion.
usersRouter.delete('/account', async (req: AuthRequest, res, next) => {
  try {
    if (!req.user?.id) throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
    const result = await usersService.deleteAccount(req.user.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
});
