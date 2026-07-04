import { db } from '../client';
import { Role, Plan, SubscriptionStatus } from '@prisma/client';

export const usersRepo = {
  async findById(id: string) {
    return db.user.findFirst({
      where: { id, deletedAt: null },
      include: { subscription: true }
    });
  },

  async findByEmail(email: string) {
    return db.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { subscription: true }
    });
  },

  async create(data: { email: string; name?: string; passwordHash?: string }) {
    return db.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash: data.passwordHash,
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
            aiCreditsUsed: 0,
            aiCreditsLimit: 10
          }
        },
        streak: {
          create: {
            currentStreak: 0,
            longestStreak: 0
          }
        }
      },
      include: { subscription: true }
    });
  },

  async update(id: string, data: { name?: string; bio?: string; avatarUrl?: string; passwordHash?: string; emailVerified?: boolean; role?: Role; lastLoginAt?: Date }) {
    return db.user.update({
      where: { id },
      data
    });
  },

  // Lockout management (AUTH-10)
  async incrementLoginAttempts(id: string) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return null;
    const newAttempts = user.loginAttempts + 1;
    
    // Lock for 15 minutes if attempts >= 5
    if (newAttempts >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      return db.user.update({
        where: { id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil
        }
      });
    }

    return db.user.update({
      where: { id },
      data: { loginAttempts: newAttempts }
    });
  },

  async resetLoginAttempts(id: string) {
    return db.user.update({
      where: { id },
      data: {
        loginAttempts: 0,
        lockedUntil: null
      }
    });
  },

  // Verification Tokens (AUTH-01)
  async createVerificationToken(userId: string, tokenHash: string, expiresAt: Date) {
    return db.emailVerification.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt
      }
    });
  },

  async findVerificationToken(tokenHash: string) {
    return db.emailVerification.findFirst({
      where: {
        token: tokenHash,
        usedAt: null,
        expiresAt: { gte: new Date() }
      }
    });
  },

  async markVerificationTokenUsed(id: string) {
    const token = await db.emailVerification.findUnique({ where: { id } });
    if (!token) throw new Error('Token not found');
    if (token.usedAt) throw new Error('Token already used');
    if (token.expiresAt < new Date()) throw new Error('Token has expired');

    return db.emailVerification.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  },

  // Password Resets (AUTH-03)
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    // Invalidate existing active tokens
    await db.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    });

    return db.passwordReset.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt
      }
    });
  },

  async findPasswordResetToken(tokenHash: string) {
    return db.passwordReset.findFirst({
      where: {
        token: tokenHash,
        usedAt: null,
        expiresAt: { gte: new Date() }
      }
    });
  },

  async markPasswordResetTokenUsed(id: string) {
    const token = await db.passwordReset.findUnique({ where: { id } });
    if (!token) throw new Error('Token not found');
    if (token.usedAt) throw new Error('Token already used');
    if (token.expiresAt < new Date()) throw new Error('Token has expired');

    return db.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() }
    });
  },

  // OAuth linkage (AUTH-02)
  async linkOAuthAccount(userId: string, provider: string, providerUserId: string, accessToken?: string, refreshToken?: string, expiresAt?: Date) {
    return db.oAuthAccount.create({
      data: {
        userId,
        provider,
        providerUserId,
        accessToken,
        refreshToken,
        expiresAt
      }
    });
  },

  async findOAuthAccount(provider: string, providerUserId: string) {
    return db.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider, providerUserId }
      },
      include: {
        user: {
          include: { subscription: true }
        }
      }
    });
  },

  // Refresh Token Rotation (AUTH-04)
  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date, userAgent?: string, ipAddress?: string) {
    return db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress
      }
    });
  },

  async findRefreshToken(tokenHash: string) {
    return db.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gte: new Date() }
      },
      include: { user: true }
    });
  },

  async revokeRefreshToken(tokenHash: string) {
    return db.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    });
  },

  async revokeAllRefreshTokensForUser(userId: string) {
    return db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  },

  // Soft delete (AUTH-06)
  async softDeleteUser(id: string) {
    await this.revokeAllRefreshTokensForUser(id);
    return db.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
};
