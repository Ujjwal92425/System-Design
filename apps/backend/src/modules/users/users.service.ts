/**
 * apps/backend/src/modules/users/users.service.ts
 *
 * Business logic layer for user profile management.
 * Never calls DB directly — delegates to usersRepo.
 *
 * Responsibilities:
 *   - Profile read / update
 *   - Password change (verify current → hash new)
 *   - Soft account deletion (GDPR compliant)
 *   - Subscription status helpers
 */

import bcrypt from 'bcrypt';
import { usersRepo } from '@sd-os/db';
import { AppError, Errors } from '../../utils/errors';
import { logger } from '../../utils/logger';

export const usersService = {
  /**
   * Return the authenticated user's public profile.
   * Includes subscription so the frontend knows plan limits.
   */
  async getProfile(userId: string) {
    const user = await usersRepo.findById(userId);
    if (!user) throw Errors.notFound('User');

    // Omit sensitive fields before returning
    const { passwordHash: _, ...safeUser } = user as any;
    return safeUser;
  },

  /**
   * Update name, bio, or avatar.
   * Empty string for avatarUrl clears the avatar.
   */
  async updateProfile(
    userId: string,
    data: { name?: string; bio?: string; avatarUrl?: string }
  ) {
    const user = await usersRepo.findById(userId);
    if (!user) throw Errors.notFound('User');

    const updated = await usersRepo.update(userId, {
      ...(data.name !== undefined      && { name:      data.name }),
      ...(data.bio !== undefined       && { bio:       data.bio }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
    } as any);

    logger.info({ userId }, 'User profile updated');

    const { passwordHash: _, ...safeUser } = updated as any;
    return safeUser;
  },

  /**
   * Change password — requires the current password to prevent
   * account hijacking via an unattended session (AUTH-06).
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await usersRepo.findById(userId);
    if (!user) throw Errors.notFound('User');

    if (!user.passwordHash) {
      throw new AppError(
        'OAUTH_ONLY_ACCOUNT',
        'This account uses OAuth sign-in and does not have a password.',
        400
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError(
        'INVALID_CURRENT_PASSWORD',
        'Current password is incorrect.',
        400
      );
    }

    if (currentPassword === newPassword) {
      throw new AppError(
        'SAME_PASSWORD',
        'New password must be different from the current password.',
        400
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await usersRepo.update(userId, { passwordHash: newHash } as any);

    // Revoke all refresh tokens so other sessions are terminated
    await usersRepo.revokeAllRefreshTokensForUser(userId);

    logger.info({ userId }, 'User password changed — all sessions revoked');
    return { success: true };
  },

  /**
   * Initiate account deletion.
   * Soft-deletes the user record (sets deletedAt) and revokes all tokens.
   * Actual data purge happens via a scheduled job (GDPR 30-day grace period).
   */
  async deleteAccount(userId: string) {
    await usersRepo.softDeleteUser(userId);
    logger.info({ userId }, 'User account soft-deleted (GDPR grace period started)');
    return { success: true };
  },
};
