import { db } from '../client';
import { LessonStatus } from '@prisma/client';

export const progressRepo = {
  async getTrackProgress(userId: string, trackId: string) {
    return db.userProgress.findUnique({
      where: { userId_trackId: { userId, trackId } }
    });
  },

  async listProgress(userId: string) {
    return db.lessonState.findMany({
      where: { userId }
    });
  },

  async upsertLessonState(
    userId: string,
    lessonId: string,
    data: { status?: LessonStatus; resumeState?: any; notes?: string }
  ) {
    const status = data.status;
    const completedAt = status === 'COMPLETE' ? new Date() : undefined;

    const state = await db.lessonState.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        ...(status && { status }),
        ...(completedAt && { completedAt }),
        ...(data.resumeState && { resumeState: data.resumeState }),
        ...(data.notes !== undefined && { notes: data.notes })
      },
      create: {
        userId,
        lessonId,
        status: status || 'NOT_STARTED',
        completedAt,
        resumeState: data.resumeState,
        notes: data.notes
      },
      include: {
        lesson: true
      }
    });

    // Update track progress aggregate if status changes
    if (status) {
      await this.recalculateTrackProgress(userId, state.lesson.moduleId);
    }

    return state;
  },

  async toggleBookmark(userId: string, lessonId: string, bookmarked: boolean) {
    return db.lessonState.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { bookmarked },
      create: {
        userId,
        lessonId,
        bookmarked,
        status: 'NOT_STARTED'
      }
    });
  },

  async getBookmarks(userId: string) {
    return db.lessonState.findMany({
      where: { userId, bookmarked: true },
      include: { lesson: true }
    });
  },

  // Streaks Management (LEARN-21)
  async updateStreak(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return db.$transaction(async (tx) => {
      const streak = await tx.userStreak.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          currentStreak: 0,
          longestStreak: 0
        }
      });

      const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
      if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
      }

      if (!lastActive) {
        // First activity ever
        return tx.userStreak.update({
          where: { userId },
          data: {
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: today
          }
        });
      }

      const diffTime = today.getTime() - lastActive.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already active today, streak stays the same
        return streak;
      } else if (diffDays === 1) {
        // Increment streak
        const newCurrent = streak.currentStreak + 1;
        const newLongest = Math.max(streak.longestStreak, newCurrent);
        return tx.userStreak.update({
          where: { userId },
          data: {
            currentStreak: newCurrent,
            longestStreak: newLongest,
            lastActiveDate: today
          }
        });
      } else {
        // Missed a day, reset current streak to 1
        return tx.userStreak.update({
          where: { userId },
          data: {
            currentStreak: 1,
            lastActiveDate: today
          }
        });
      }
    });
  },

  // Helper to update UserProgress complete percentage
  async recalculateTrackProgress(userId: string, moduleId: string) {
    const mod = await db.module.findUnique({
      where: { id: moduleId },
      select: { trackId: true }
    });

    if (!mod) return;

    const trackId = mod.trackId;

    // Get total published lessons in this track
    const totalLessons = await db.lesson.count({
      where: {
        isPublished: true,
        module: { trackId }
      }
    });

    if (totalLessons === 0) return;

    // Get completed lessons by this user in this track
    const completedLessons = await db.lessonState.count({
      where: {
        userId,
        status: 'COMPLETE',
        lesson: {
          isPublished: true,
          module: { trackId }
        }
      }
    });

    const completedPct = completedLessons / totalLessons;

    await db.userProgress.upsert({
      where: { userId_trackId: { userId, trackId } },
      update: {
        completedPct,
        lastActiveAt: new Date()
      },
      create: {
        userId,
        trackId,
        completedPct,
        lastActiveAt: new Date()
      }
    });
  }
};
