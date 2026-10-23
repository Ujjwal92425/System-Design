import { db, interviewsRepo } from '@sd-os/db';
import { Prisma } from '@prisma/client';
import { aiService } from '../ai/ai.service';
import { scoreDesign, mergeAiIntoScores } from './scoring.service';
import { AppError, Errors } from '../../utils/errors';
import type { InterviewPrompt, RubricCriteria } from '@sd-os/shared';

const INTERVIEW_LIMITS = {
  USER: 2,
  PRO:  Infinity,
  ADMIN: Infinity,
  INSTRUCTOR: Infinity,
} as const;

export const interviewService = {
  async getPrompts(filters?: { difficulty?: string; tag?: string }) {
    return interviewsRepo.listPrompts(filters);
  },

  async getPrompt(id: string) {
    return interviewsRepo.findPromptById(id);
  },

  async startSession(userId: string, promptId: string, role = 'USER') {
    const prompt = await interviewsRepo.findPromptById(promptId);
    if (!prompt) {
      throw Errors.notFound('Interview prompt');
    }

    const limit = INTERVIEW_LIMITS[role as keyof typeof INTERVIEW_LIMITS] ?? INTERVIEW_LIMITS.USER;
    if (limit !== Infinity) {
      return db.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`
          SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
        `);
        const count = await tx.interviewSession.count({ where: { userId } });
        if (count >= limit) {
          throw new AppError(
            'PLAN_LIMIT',
            `Free accounts can start up to ${limit} interview sessions. Delete past sessions to start a new one.`,
            402
          );
        }

        return interviewsRepo.createSession(userId, promptId, prompt.timeLimitMin, tx);
      });
    }

    return interviewsRepo.createSession(userId, promptId, prompt.timeLimitMin);
  },

  async getSession(id: string, userId?: string) {
    const session = await interviewsRepo.getSession(id, userId);
    if (!session) {
      throw Errors.notFound('Interview session');
    }
    return session;
  },

  async useHint(id: string, userId?: string) {
    const session = await interviewsRepo.getSession(id, userId);
    if (!session) {
      throw Errors.notFound('Interview session');
    }
    const maxHints = session.prompt?.hints?.length || 0;
    if (session.hintsUsed >= maxHints) {
      throw Errors.conflict('No hints remaining');
    }
    const updated = await interviewsRepo.incrementHintsUsed(id, maxHints);
    if (!updated) throw Errors.conflict('No hints remaining or interview is no longer active');
    return updated;
  },

  async linkDesign(id: string, designId: string, userId?: string) {
    const session = await interviewsRepo.getSession(id, userId);
    if (!session) {
      throw Errors.notFound('Interview session');
    }

    const design = await db.design.findFirst({
      where: { id: designId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!design) throw Errors.notFound('Design');

    return interviewsRepo.linkDesignToSession(id, designId);
  },

  async submitSession(id: string, design: any, userId?: string) {
    const session = await interviewsRepo.getSession(id, userId);
    if (!session) {
      throw Errors.notFound('Interview session');
    }

    const rubric = ((session.prompt?.rubric as any) || []) as RubricCriteria[];
    const prompt = session.prompt as unknown as InterviewPrompt;

    // Step 1: Rules-based scoring
    const rulesEvaluation = scoreDesign(design, rubric);

    // Step 2: AI analysis with interview context
    let aiResult;
    try {
      aiResult = await aiService.analyzeInterviewDesign(
        { nodes: design.nodes || [], edges: design.edges || [] },
        { prompt, rubric }
      );
    } catch {
      aiResult = { scores: {}, issues: [], overallScore: 0, overallAssessment: '' };
    }

    // Step 3: Merge rules + AI scores
    const finalResult = mergeAiIntoScores(rulesEvaluation, aiResult);

    // Step 4: Save evaluation to DB
    const score = await interviewsRepo.saveScore({
      sessionId: id,
      totalScore: finalResult.totalScore,
      rubricResults: finalResult.results,
      missedItems: finalResult.missed,
      aiFeedback: finalResult.aiFeedback,
    });

    return {
      session,
      score,
      evaluation: finalResult,
    };
  },

  async getUserHistory(userId: string) {
    return interviewsRepo.getHistory(userId);
  }
};
