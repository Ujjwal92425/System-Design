import { db } from '../client';
import { Prisma, Role, User } from '@prisma/client';

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
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    const users = await db.$queryRaw<User[]>(Prisma.sql`
      UPDATE "User"
      SET
        "loginAttempts" = "loginAttempts" + 1,
        "lockedUntil" = CASE
          WHEN "loginAttempts" + 1 >= 5 THEN ${lockedUntil}
          ELSE "lockedUntil"
        END
      WHERE "id" = ${id}
      RETURNING *
    `);
    return users[0] ?? null;
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
  async createVerificationToken(userId: string, token: string, expiresAt: Date) {
    return db.emailVerification.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
  },

  async findVerificationToken(token: string) {
    return db.emailVerification.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gte: new Date() }
      }
    });
  },

  async consumeVerificationToken(id: string) {
    return db.emailVerification.updateMany({
      where: { id, usedAt: null, expiresAt: { gte: new Date() } },
      data: { usedAt: new Date() },
    });
  },

  // Password Resets (AUTH-03)
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    // Invalidate existing active tokens
    await db.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    });

    return db.passwordReset.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
  },

  async findPasswordResetToken(token: string) {
    return db.passwordReset.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gte: new Date() }
      }
    });
  },

  async consumePasswordResetToken(id: string) {
    return db.passwordReset.updateMany({
      where: { id, usedAt: null, expiresAt: { gte: new Date() } },
      data: { usedAt: new Date() },
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

  async rotateRefreshToken(
    tokenHash: string,
    replacement: { userId: string; tokenHash: string; expiresAt: Date; userAgent?: string; ipAddress?: string }
  ) {
    return db.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gte: new Date() },
        },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) return false;

      await tx.refreshToken.create({ data: replacement });
      return true;
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
