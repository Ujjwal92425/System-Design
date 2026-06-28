import { db } from '@sd-os/db';

export const FREE_CANVAS_LIMIT = 2;
export const FREE_INTERVIEW_LIMIT = 2;

export const usageService = {
  async getUsage(userId: string) {
    const [canvasCount, interviewCount] = await Promise.all([
      db.design.count({ where: { userId, deletedAt: null } }),
      db.interviewSession.count({ where: { userId } }),
    ]);

    return {
      canvasCount,
      canvasLimit: FREE_CANVAS_LIMIT,
      interviewCount,
      interviewLimit: FREE_INTERVIEW_LIMIT,
    };
  },
};
