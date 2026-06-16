import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { usersRepo } from '@sd-os/db';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { emailQueue } from '../../jobs/queues';
import { analyticsService } from '../analytics/analytics.service';

// Helper to hash token for secure DB storage (AUTH-04)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async register(data: { email: string; password?: string; name?: string }) {
    const existing = await usersRepo.findByEmail(data.email);
    if (existing) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'A user with this email is already registered', 400);
    }

    let hash: string | undefined;
    if (data.password) {
      hash = await bcrypt.hash(data.password, 10);
    }

    const user = await usersRepo.create({
      email: data.email,
      passwordHash: hash,
      name: data.name
    });

    // Generate Verification Token (AUTH-01)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await usersRepo.createVerificationToken(user.id, verificationToken, expiresAt);

    // Queue verification email
    try {
      await emailQueue.add('send-verification', {
        to: user.email,
        subject: 'Verify your System Design OS account',
        type: 'verification',
        token: verificationToken,
        name: user.name || undefined
      });
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to queue verification email');
    }

    analyticsService.track(user.id, 'user:registered', {
      email: user.email, name: user.name, role: user.role,
    });
    analyticsService.identify(user.id, { email: user.email, name: user.name, role: user.role });

    logger.debug({ userId: user.id, email: user.email }, 'User registered. Verification token created.');

    return { user, verificationToken };
  },

  async verifyEmail(token: string) {
    const record = await usersRepo.findVerificationToken(token);
    if (!record) {
      throw new AppError('INVALID_VERIFICATION_TOKEN', 'Verification token is invalid, used, or expired', 400);
    }

    await usersRepo.markVerificationTokenUsed(record.id);
    await usersRepo.update(record.userId, { emailVerified: true });

    logger.info({ userId: record.userId }, 'User email successfully verified.');
    return { success: true };
  },

  async login(data: { email: string; password?: string }, userAgent?: string, ipAddress?: string) {
    const user = await usersRepo.findByEmail(data.email);
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // AUTH-10: Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new AppError('ACCOUNT_LOCKED', `Account is temporarily locked. Try again in ${remainingMin} minute(s).`, 403);
    }

    // If password is provided, verify it
    if (user.passwordHash && data.password) {
      const match = await bcrypt.compare(data.password, user.passwordHash);
      if (!match) {
        // Increment attempts and lock if threshold is met
        await usersRepo.incrementLoginAttempts(user.id);
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }
    } else if (user.passwordHash || data.password) {
      // Mismatched login mode
      await usersRepo.incrementLoginAttempts(user.id);
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Reset login attempts on successful login
    await usersRepo.resetLoginAttempts(user.id);

    // Generate tokens
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await usersRepo.saveRefreshToken(user.id, refreshTokenHash, refreshExpiresAt, userAgent, ipAddress);

    // Update last login
    await usersRepo.update(user.id, { lastLoginAt: new Date() });

    analyticsService.track(user.id, 'user:logged_in', {
      email: user.email, role: user.role,
    });

    logger.info({ userId: user.id }, 'User logged in successfully.');

    return { user, accessToken, refreshToken: rawRefreshToken };
  },

  async refresh(token: string, userAgent?: string, ipAddress?: string) {
    const tokenHash = hashToken(token);
    const record = await usersRepo.findRefreshToken(tokenHash);
    
    if (!record) {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', 401);
    }

    // Revoke old refresh token (Token rotation SEC-03)
    await usersRepo.revokeRefreshToken(tokenHash);

    // Check if token user is active
    if (record.user.deletedAt) {
      throw new AppError('UNAUTHORIZED', 'User account has been deleted', 401);
    }

    // Issue new access and refresh tokens
    const newAccessToken = jwt.sign(
      { sub: record.userId, role: record.user.role },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await usersRepo.saveRefreshToken(record.userId, newRefreshTokenHash, newExpiresAt, userAgent, ipAddress);

    logger.debug({ userId: record.userId }, 'Access token refreshed and refresh token rotated.');

    return { accessToken: newAccessToken, refreshToken: newRawRefreshToken };
  },

  async logout(token: string) {
    const tokenHash = hashToken(token);
    await usersRepo.revokeRefreshToken(tokenHash);
    logger.info('User logged out, refresh token revoked.');
    return { success: true };
  },

  async forgotPassword(email: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user) {
      // Return success anyway to prevent user enumeration security risk
      logger.warn({ email }, 'Forgot password requested for non-existing email.');
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await usersRepo.createPasswordResetToken(user.id, token, expiresAt);

    // Queue password reset email
    try {
      await emailQueue.add('send-reset-password', {
        to: user.email,
        subject: 'Reset your System Design OS password',
        type: 'reset-password',
        token: token,
        name: user.name || undefined
      });
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to queue password reset email');
    }

    logger.debug({ userId: user.id }, 'Password reset token created.');

    return { success: true, resetToken: token };
  },

  async resetPassword(token: string, newPassword?: string) {
    const record = await usersRepo.findPasswordResetToken(token);
    if (!record) {
      throw new AppError('INVALID_RESET_TOKEN', 'Password reset token is invalid, used, or expired', 400);
    }

    if (!newPassword) {
      throw new AppError('VALIDATION_ERROR', 'New password is required', 400);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await usersRepo.markPasswordResetTokenUsed(record.id);
    await usersRepo.update(record.userId, { passwordHash: hash });
    
    // Revoke all existing sessions for security
    await usersRepo.revokeAllRefreshTokensForUser(record.userId);

    logger.info({ userId: record.userId }, 'Password reset successfully.');
    return { success: true };
  }
};
