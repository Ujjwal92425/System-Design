/**
 * apps/backend/src/modules/admin/admin.service.ts
 *
 * Business logic for all admin CMS operations.
 *
 * Design decisions:
 *  - All writes go through this service — never directly from the router.
 *  - Slug uniqueness is enforced at DB level (@@unique) and pre-checked here
 *    to give a clean 409 error instead of a raw Prisma constraint exception.
 *  - Publishing a lesson auto-sets `publishedAt` timestamp.
 *  - Deleting a track cascades to modules → lessons → quiz → questions via
 *    Prisma onDelete: Cascade (see schema.prisma).
 */

import { db, blueprintsRepo, commentsRepo } from '@sd-os/db';
import { Role } from '@prisma/client';
import { AppError } from '../../utils/errors';
import { analyticsService } from '../analytics/analytics.service';

export const adminService = {

  // ── TRACKS ─────────────────────────────────────────────────────────────────

  /** List all tracks (published and draft) — for the admin CMS list view */
  async listAllTracks() {
    return db.track.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { modules: true } },
      },
    });
  },

  /** Get a single track with all its modules and lessons (including drafts) */
  async getTrackById(id: string) {
    const track = await db.track.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, slug: true, title: true, order: true, difficulty: true, isPublished: true },
            },
          },
        },
      },
    });
    if (!track) throw new AppError('NOT_FOUND', 'Track not found', 404);
    return track;
  },

  /** Create a new curriculum track */
  async createTrack(data: {
    slug: string; name: string; description: string; level: number; order: number;
    estimatedHours?: number; learningGoals: string[]; isPublished: boolean;
  }, userId?: string) {
    // Pre-check slug uniqueness to surface a clean 409
    const exists = await db.track.findUnique({ where: { slug: data.slug } });
    if (exists) throw new AppError('CONFLICT', `Track slug "${data.slug}" is already taken`, 409);

    const track = await db.track.create({ data });

    analyticsService.track(userId || 'system', 'admin:track:created', {
      trackId: track.id, trackSlug: track.slug, trackName: track.name,
    });

    return track;
  },

  /** Update track fields (partial update) */
  async updateTrack(id: string, data: Partial<{
    slug: string; name: string; description: string; level: number; order: number;
    estimatedHours: number; learningGoals: string[]; isPublished: boolean;
  }>, userId?: string) {
    // If slug is changing, check uniqueness
    if (data.slug) {
      const existing = await db.track.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) throw new AppError('CONFLICT', `Slug "${data.slug}" is already taken`, 409);
    }
    const track = await db.track.update({ where: { id }, data });

    analyticsService.track(userId || 'system', 'admin:track:updated', {
      trackId: id, trackSlug: data.slug, trackName: data.name,
    });

    return track;
  },

  /** Hard-delete a track (cascades to all children via Prisma) */
  async deleteTrack(id: string, userId?: string) {
    await db.track.delete({ where: { id } });
    analyticsService.track(userId || 'system', 'admin:track:deleted', { trackId: id });
  },

  // ── MODULES ────────────────────────────────────────────────────────────────

  async createModule(data: {
    trackId: string; name: string; description: string;
    order: number; estimatedMin: number; isPublished: boolean;
  }, userId?: string) {
    const mod = await db.module.create({ data });
    analyticsService.track(userId || 'system', 'admin:module:created', {
      moduleId: mod.id, moduleName: mod.name, trackId: data.trackId,
    });
    return mod;
  },

  async updateModule(id: string, data: Partial<{
    name: string; description: string; order: number; estimatedMin: number; isPublished: boolean;
  }>, userId?: string) {
    const mod = await db.module.update({ where: { id }, data });
    analyticsService.track(userId || 'system', 'admin:module:updated', {
      moduleId: id, moduleName: data.name,
    });
    return mod;
  },

  async deleteModule(id: string, userId?: string) {
    await db.module.delete({ where: { id } });
    analyticsService.track(userId || 'system', 'admin:module:deleted', { moduleId: id });
  },

  // ── LESSONS ────────────────────────────────────────────────────────────────

  /**
   * List all lessons with pagination + optional filter.
   * Returns lightweight rows (no content field) for the list view.
   */
  async listAllLessons(opts: {
    page: number;
    limit: number;
    search?: string;
    difficulty?: string;
    isPublished?: boolean;
  }) {
    const { page, limit, search, difficulty, isPublished } = opts;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title:   { contains: search, mode: 'insensitive' } },
        { slug:    { contains: search, mode: 'insensitive' } },
      ];
    }
    if (difficulty)              where.difficulty   = difficulty;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [lessons, total] = await Promise.all([
      db.lesson.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, slug: true, title: true, difficulty: true,
          estimatedMin: true, isPublished: true, publishedAt: true,
          module: { select: { id: true, name: true, track: { select: { id: true, name: true, level: true } } } },
          _count: { select: { quizzes: true } },
        },
      }),
      db.lesson.count({ where }),
    ]);

    return {
      lessons,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },

  /** Get a single lesson by ID including full content and quiz (for the editor) */
  async getLessonById(id: string) {
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: {
        module: { include: { track: true } },
        quizzes: { include: { questions: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!lesson) throw new AppError('NOT_FOUND', 'Lesson not found', 404);
    return lesson;
  },

  async createLesson(data: {
    moduleId: string; slug: string; title: string; content: string;
    order: number; estimatedMin: number; difficulty: string;
    companies: string[]; tags: string[]; isPublished: boolean;
  }, userId?: string) {
    const exists = await db.lesson.findUnique({ where: { slug: data.slug } });
    if (exists) throw new AppError('CONFLICT', `Lesson slug "${data.slug}" is already taken`, 409);

    const lesson = await db.lesson.create({
      data: {
        ...data,
        publishedAt: data.isPublished ? new Date() : undefined,
      },
    });

    analyticsService.track(userId || 'system', 'admin:lesson:created', {
      lessonId: lesson.id, lessonSlug: lesson.slug, lessonTitle: lesson.title,
      moduleId: data.moduleId, difficulty: data.difficulty, isPublished: data.isPublished,
    });

    return lesson;
  },

  async updateLesson(id: string, data: Partial<{
    slug: string; title: string; content: string; order: number; estimatedMin: number;
    difficulty: string; companies: string[]; tags: string[]; isPublished: boolean;
  }>, userId?: string) {
    // Slug uniqueness check on update
    if (data.slug) {
      const existing = await db.lesson.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) throw new AppError('CONFLICT', `Slug "${data.slug}" is already taken`, 409);
    }

    // Auto-set publishedAt when first publishing
    const updateData: any = { ...data };
    if (data.isPublished === true) {
      const current = await db.lesson.findUnique({ where: { id }, select: { publishedAt: true } });
      if (!current?.publishedAt) updateData.publishedAt = new Date();
    }

    const lesson = await db.lesson.update({ where: { id }, data: updateData });

    analyticsService.track(userId || 'system', 'admin:lesson:updated', {
      lessonId: id, lessonSlug: data.slug, lessonTitle: data.title,
      isPublished: data.isPublished, difficulty: data.difficulty,
    });

    return lesson;
  },

  async deleteLesson(id: string, userId?: string) {
    await db.lesson.delete({ where: { id } });
    analyticsService.track(userId || 'system', 'admin:lesson:deleted', { lessonId: id });
  },

  // ── QUIZZES & QUESTIONS ───────────────────────────────────────────────────

  async createQuiz(data: {
    lessonId: string; title: string; passingScore: number; isRequired: boolean;
  }, userId?: string) {
    const quiz = await db.quiz.create({ data });
    analyticsService.track(userId || 'system', 'admin:quiz:created', {
      quizId: quiz.id, quizTitle: quiz.title, lessonId: data.lessonId,
    });
    return quiz;
  },

  async createQuestion(data: {
    quizId: string; type: string; content: string; options: string[];
    correctAnswer: string; explanation: string; order: number;
  }, userId?: string) {
    const question = await db.question.create({ data });
    analyticsService.track(userId || 'system', 'admin:question:created', {
      questionId: question.id, quizId: data.quizId, type: data.type,
    });
    return question;
  },

  async updateQuestion(id: string, data: Partial<{
    type: string; content: string; options: string[];
    correctAnswer: string; explanation: string; order: number;
  }>, userId?: string) {
    const question = await db.question.update({ where: { id }, data });
    analyticsService.track(userId || 'system', 'admin:question:updated', {
      questionId: id, type: data.type,
    });
    return question;
  },

  async deleteQuestion(id: string, userId?: string) {
    await db.question.delete({ where: { id } });
    analyticsService.track(userId || 'system', 'admin:question:deleted', { questionId: id });
  },

  // ── PLATFORM OVERVIEW ─────────────────────────────────────────────────────

  /** Admin dashboard stats — counts across all models */
  async getPlatformOverview() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      users, tracks, lessons, designs, interviews,
      proUsers, publishedLessons,
      registrationsLast7d, loginsLast7d,
      designsCreatedLast7d, interviewsCompletedLast7d,
    ] = await Promise.all([
      db.user.count(),
      db.track.count(),
      db.lesson.count(),
      db.design.count(),
      db.interviewSession.count(),
      db.subscription.count({ where: { plan: 'PRO', status: 'ACTIVE' } }),
      db.lesson.count({ where: { isPublished: true } }),
      db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      db.design.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.interviewSession.count({ where: { startedAt: { gte: sevenDaysAgo }, endedAt: { not: null } } }),
    ]);

    return {
      users, proUsers, tracks, lessons, publishedLessons, designs, interviews,
      registrationsLast7d, loginsLast7d,
      designsCreatedLast7d, interviewsCompletedLast7d,
    };
  },

  // ── USER MANAGEMENT ────────────────────────────────────────────────────────

  /** List all users with pagination, search, and role filter */
  async listAllUsers(opts: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
  }) {
    const { page, limit, search, role, status } = opts;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name:  { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (status === 'suspended') {
      where.lockedUntil = { not: null };
    } else if (status === 'active') {
      where.lockedUntil = null;
      where.deletedAt = null;
    } else if (status === 'deleted') {
      where.deletedAt = { not: null };
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true,
          avatarUrl: true, emailVerified: true,
          createdAt: true, lastLoginAt: true,
          lockedUntil: true, deletedAt: true,
          _count: { select: { designs: true, interviews: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },

  /** Get single user with full details for admin edit view */
  async getUserById(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        _count: { select: { designs: true, interviews: true } },
      },
    });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
    const { passwordHash: _, ...safeUser } = user as any;
    return safeUser;
  },

  /** Update user fields (name, role, emailVerified) */
  async updateUser(id: string, data: {
    name?: string;
    role?: Role;
    emailVerified?: boolean;
  }) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    const updated = await db.user.update({ where: { id }, data });
    analyticsService.track('admin', 'admin:user:updated', {
      targetUserId: id, updates: Object.keys(data),
    });
    const { passwordHash: _, ...safeUser } = updated as any;
    return safeUser;
  },

  /** Suspend a user (lock account) */
  async suspendUser(id: string, durationMin: number = 1440) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    const lockedUntil = new Date(Date.now() + durationMin * 60 * 1000);
    await db.user.update({ where: { id }, data: { lockedUntil } });
    await db.user.update({ where: { id }, data: { loginAttempts: 5 } });

    analyticsService.track('admin', 'admin:user:suspended', {
      targetUserId: id, durationMin,
    });
    return { suspended: true, lockedUntil };
  },

  /** Unsuspend a user (clear lock) */
  async unsuspendUser(id: string) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    await db.user.update({ where: { id }, data: { lockedUntil: null, loginAttempts: 0 } });
    analyticsService.track('admin', 'admin:user:unsuspended', { targetUserId: id });
    return { unsuspended: true };
  },

  /** Soft-delete a user */
  async deleteUser(id: string) {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    await db.user.update({ where: { id }, data: { deletedAt: new Date() } });
    await db.user.update({ where: { id }, data: { email: `deleted-${id}@sdos.academy` } });
    await db.user.update({ where: { id }, data: { name: 'Deleted User' } });

    analyticsService.track('admin', 'admin:user:deleted', { targetUserId: id });
    return { deleted: true };
  },

  /** Create a single user (admin) */
  async createUser(data: { email: string; name?: string; password?: string; role?: string }) {
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('CONFLICT', 'Email already registered', 409);

    const hash = data.password ? await require('bcrypt').hash(data.password, 10) : undefined;
    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name || data.email.split('@')[0],
        passwordHash: hash,
        role: (data.role as any) || 'USER',
        emailVerified: true,
      },
    });

    analyticsService.track('admin', 'admin:user:created', {
      targetUserId: user.id, email: user.email, role: user.role,
    });
    const { passwordHash: _, ...safeUser } = user as any;
    return safeUser;
  },

  /** Bulk import users from Excel/CSV import */
  async importUsers(users: Array<{ email: string; name?: string; role?: string }>) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const u of users) {
      try {
        const existing = await db.user.findUnique({ where: { email: u.email } });
        if (existing) {
          results.skipped++;
          continue;
        }
        await db.user.create({
          data: {
            email: u.email,
            name: u.name || u.email.split('@')[0],
            role: (u.role as any) || 'USER',
            emailVerified: true,
          },
        });
        results.created++;
      } catch (err: any) {
        results.errors.push(`Failed to create ${u.email}: ${err.message}`);
      }
    }

    analyticsService.track('admin', 'admin:users:imported', {
      created: results.created, skipped: results.skipped, errorCount: results.errors.length,
    });
    return results;
  },

  /** Export users as CSV data */
  async exportUsersCSV() {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, role: true,
        emailVerified: true, createdAt: true, lastLoginAt: true,
        deletedAt: true,
      },
    });

    const header = 'ID,Email,Name,Role,EmailVerified,CreatedAt,LastLoginAt,DeletedAt';
    const rows = users.map((u) =>
      [u.id, u.email, u.name || '', u.role, u.emailVerified ? 'Yes' : 'No',
       u.createdAt.toISOString(), u.lastLoginAt?.toISOString() || '', u.deletedAt?.toISOString() || '']
        .map((v) => `"${v.replace(/"/g, '""')}"`).join(',')
    );

    return { csv: [header, ...rows].join('\n'), count: users.length };
  },

  // ── RECENT EVENTS ──────────────────────────────────────────────────────────

  /** Get recent events from the database for the analytics dashboard */
  async getRecentEvents(limit: number = 20) {
    // Query users who recently registered and logged in
    const [recentUsers, recentLogins, recentDesigns, recentInterviews] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      db.user.findMany({
        where: { lastLoginAt: { not: null } },
        orderBy: { lastLoginAt: 'desc' },
        take: limit,
        select: { id: true, email: true, name: true, lastLoginAt: true },
      }),
      db.design.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, title: true, userId: true, createdAt: true, user: { select: { email: true } } },
      }),
      db.interviewSession.findMany({
        where: { endedAt: { not: null } },
        orderBy: { endedAt: 'desc' },
        take: limit,
        select: { id: true, userId: true, endedAt: true, user: { select: { email: true } } },
      }),
    ]);

    const events: Array<{
      id: string;
      event: string;
      timestamp: string;
      userEmail: string;
      metadata: string;
    }> = [];

    recentUsers.forEach((u) => {
      events.push({
        id: `reg-${u.id}`,
        event: 'user:registered',
        timestamp: u.createdAt.toISOString(),
        userEmail: u.email,
        metadata: u.name || '',
      });
    });

    recentLogins.forEach((u) => {
      if (!u.lastLoginAt) return;
      events.push({
        id: `login-${u.id}`,
        event: 'user:logged_in',
        timestamp: u.lastLoginAt.toISOString(),
        userEmail: u.email,
        metadata: u.name || '',
      });
    });

    recentDesigns.forEach((d) => {
      events.push({
        id: `design-${d.id}`,
        event: 'design:created',
        timestamp: d.createdAt.toISOString(),
        userEmail: d.user?.email || 'unknown',
        metadata: d.title,
      });
    });

    recentInterviews.forEach((s) => {
      if (!s.endedAt) return;
      events.push({
        id: `interview-${s.id}`,
        event: 'interview:completed',
        timestamp: s.endedAt.toISOString(),
        userEmail: s.user?.email || 'unknown',
        metadata: 'Interview completed',
      });
    });

    // Sort by timestamp descending and trim to limit
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events.slice(0, limit);
  },

  // ── Blueprint Moderation ──────────────────────────────────────────────────

  async listAllBlueprints() {
    return db.blueprint.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
        design: { select: { id: true, title: true } },
        _count: { select: { comments: true, votes: true, reports: true } },
      },
    });
  },

  async featureBlueprint(id: string, featured: boolean) {
    return db.blueprint.update({ where: { id }, data: { isFeatured: featured } });
  },

  async removeBlueprint(id: string) {
    return db.blueprint.update({ where: { id }, data: { isPublished: false } });
  },

  async listPendingReports() {
    return db.report.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        blueprint: { select: { id: true, title: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async listCommentsForBlueprint(blueprintId: string) {
    return db.comment.findMany({
      where: { blueprintId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  },

  async reviewReport(id: string, status: string) {
    return db.report.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
    });
  },

  async createBlueprint(data: {
    designId: string; title: string; description: string; tags: string[];
    mediaUrls?: string[]; authorId?: string;
  }, adminUserId: string) {
    return blueprintsRepo.create({
      designId: data.designId,
      authorId: data.authorId ?? adminUserId,
      title: data.title,
      description: data.description,
      tags: data.tags,
      mediaUrls: data.mediaUrls,
    });
  },

  async hardDeleteBlueprint(id: string) {
    const bp = await db.blueprint.findUnique({ where: { id } });
    if (!bp) throw new AppError('NOT_FOUND', 'Blueprint not found', 404);
    await blueprintsRepo.hardDelete(id);
    return { deleted: true };
  },

  async deleteComment(id: string) {
    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) throw new AppError('NOT_FOUND', 'Comment not found', 404);
    await commentsRepo.adminDelete(id);
    return { deleted: true };
  },
};
