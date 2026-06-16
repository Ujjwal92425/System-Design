import { db } from '../client';
import { InterviewStatus } from '@prisma/client';

export const interviewsRepo = {
  async listPrompts(filters?: { difficulty?: string; tag?: string }) {
    const whereClause: any = { isPublished: true };
    if (filters?.difficulty) {
      whereClause.difficulty = filters.difficulty;
    }
    if (filters?.tag) {
      whereClause.tags = { has: filters.tag };
    }

    return db.interviewPrompt.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
  },

  async findPromptById(id: string) {
    return db.interviewPrompt.findUnique({
      where: { id }
    });
  },

  async createSession(userId: string, promptId: string, timeLimit: number) {
    return db.interviewSession.create({
      data: {
        userId,
        promptId,
        timeLimit,
        status: 'IN_PROGRESS'
      },
      include: {
        prompt: true
      }
    });
  },

  async getSession(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;
    return db.interviewSession.findFirst({
      where,
      include: {
        prompt: true,
        score: true,
        design: true
      }
    });
  },

  async linkDesignToSession(id: string, designId: string) {
    return db.interviewSession.update({
      where: { id },
      data: { designId }
    });
  },

  async incrementHintsUsed(id: string) {
    return db.interviewSession.update({
      where: { id },
      data: {
        hintsUsed: { increment: 1 }
      }
    });
  },

  async saveScore(data: {
    sessionId: string;
    totalScore: number;
    rubricResults: any;
    aiFeedback?: string;
    missedItems: any;
    aiJobId?: string;
  }) {
    return db.$transaction(async (tx) => {
      // Create or update scorecard
      const score = await tx.interviewScore.upsert({
        where: { sessionId: data.sessionId },
        update: {
          totalScore: data.totalScore,
          rubricResults: data.rubricResults,
          aiFeedback: data.aiFeedback,
          missedItems: data.missedItems,
          aiJobId: data.aiJobId
        },
        create: {
          sessionId: data.sessionId,
          totalScore: data.totalScore,
          rubricResults: data.rubricResults,
          aiFeedback: data.aiFeedback,
          missedItems: data.missedItems,
          aiJobId: data.aiJobId
        }
      });

      // Update session status to SCORED
      await tx.interviewSession.update({
        where: { id: data.sessionId },
        data: {
          status: 'SCORED',
          endedAt: new Date()
        }
      });

      return score;
    });
  },

  async updateAiFeedback(sessionId: string, aiFeedback: string) {
    return db.interviewScore.update({
      where: { sessionId },
      data: { aiFeedback }
    });
  },

  async getHistory(userId: string) {
    return db.interviewSession.findMany({
      where: { userId },
      include: {
        prompt: true,
        score: true
      },
      orderBy: { startedAt: 'desc' }
    });
  }
};
