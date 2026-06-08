import { db } from '../client';

export const progressRepo = {
  async getTrackProgress(userId: string, trackId: string) {
    return db.userProgress.findUnique({
      where: { userId_trackId: { userId, trackId } }
    });
  },

  async upsertLessonState(userId: string, lessonId: string, status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE') {
    return db.lessonState.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { status: status as any, completedAt: status === 'COMPLETE' ? new Date() : null },
      create: { userId, lessonId, status: status as any, completedAt: status === 'COMPLETE' ? new Date() : null }
    });
  }
};
