import { db } from '../client';

export const interviewsRepo = {
  async createSession(userId: string, promptId: string, timeLimit: number) {
    return db.interviewSession.create({
      data: {
        userId,
        promptId,
        timeLimit,
        status: 'IN_PROGRESS'
      }
    });
  },

  async saveScore(sessionId: string, totalScore: number, rubricResults: any, aiFeedback: string, missedItems: any) {
    return db.interviewScore.create({
      data: {
        sessionId,
        totalScore,
        rubricResults,
        aiFeedback,
        missedItems
      }
    });
  }
};
