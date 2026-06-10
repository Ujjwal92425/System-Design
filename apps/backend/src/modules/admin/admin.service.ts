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

import { db } from '@sd-os/db';
import { AppError } from '../../utils/errors';

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
  }) {
    // Pre-check slug uniqueness to surface a clean 409
    const exists = await db.track.findUnique({ where: { slug: data.slug } });
    if (exists) throw new AppError('CONFLICT', `Track slug "${data.slug}" is already taken`, 409);

    return db.track.create({ data });
  },

  /** Update track fields (partial update) */
  async updateTrack(id: string, data: Partial<{
    slug: string; name: string; description: string; level: number; order: number;
    estimatedHours: number; learningGoals: string[]; isPublished: boolean;
  }>) {
    // If slug is changing, check uniqueness
    if (data.slug) {
      const existing = await db.track.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) throw new AppError('CONFLICT', `Slug "${data.slug}" is already taken`, 409);
    }
    return db.track.update({ where: { id }, data });
  },

  /** Hard-delete a track (cascades to all children via Prisma) */
  async deleteTrack(id: string) {
    await db.track.delete({ where: { id } });
  },

  // ── MODULES ────────────────────────────────────────────────────────────────

  async createModule(data: {
    trackId: string; name: string; description: string;
    order: number; estimatedMin: number; isPublished: boolean;
  }) {
    return db.module.create({ data });
  },

  async updateModule(id: string, data: Partial<{
    name: string; description: string; order: number; estimatedMin: number; isPublished: boolean;
  }>) {
    return db.module.update({ where: { id }, data });
  },

  async deleteModule(id: string) {
    await db.module.delete({ where: { id } });
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
  }) {
    const exists = await db.lesson.findUnique({ where: { slug: data.slug } });
    if (exists) throw new AppError('CONFLICT', `Lesson slug "${data.slug}" is already taken`, 409);

    return db.lesson.create({
      data: {
        ...data,
        publishedAt: data.isPublished ? new Date() : undefined,
      },
    });
  },

  async updateLesson(id: string, data: Partial<{
    slug: string; title: string; content: string; order: number; estimatedMin: number;
    difficulty: string; companies: string[]; tags: string[]; isPublished: boolean;
  }>) {
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

    return db.lesson.update({ where: { id }, data: updateData });
  },

  async deleteLesson(id: string) {
    await db.lesson.delete({ where: { id } });
  },

  // ── QUIZZES & QUESTIONS ───────────────────────────────────────────────────

  async createQuiz(data: {
    lessonId: string; title: string; passingScore: number; isRequired: boolean;
  }) {
    return db.quiz.create({ data });
  },

  async createQuestion(data: {
    quizId: string; type: string; content: string; options: string[];
    correctAnswer: string; explanation: string; order: number;
  }) {
    return db.question.create({ data });
  },

  async updateQuestion(id: string, data: Partial<{
    type: string; content: string; options: string[];
    correctAnswer: string; explanation: string; order: number;
  }>) {
    return db.question.update({ where: { id }, data });
  },

  async deleteQuestion(id: string) {
    await db.question.delete({ where: { id } });
  },

  // ── PLATFORM OVERVIEW ─────────────────────────────────────────────────────

  /** Admin dashboard stats — counts across all models */
  async getPlatformOverview() {
    const [users, tracks, lessons, designs, interviews] = await Promise.all([
      db.user.count(),
      db.track.count(),
      db.lesson.count(),
      db.design.count(),
      db.interviewSession.count(),
    ]);

    const proUsers = await db.subscription.count({ where: { plan: 'PRO', status: 'ACTIVE' } });
    const publishedLessons = await db.lesson.count({ where: { isPublished: true } });

    return { users, proUsers, tracks, lessons, publishedLessons, designs, interviews };
  },
};
