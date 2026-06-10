import { interviewsRepo } from '@sd-os/db';

export const interviewService = {
  async getPrompts(filters?: { difficulty?: string; tag?: string }) {
    return interviewsRepo.listPrompts(filters);
  },

  async getPrompt(id: string) {
    return interviewsRepo.findPromptById(id);
  },

  async startSession(userId: string, promptId: string) {
    const prompt = await interviewsRepo.findPromptById(promptId);
    if (!prompt) {
      throw new Error('Interview prompt not found');
    }
    return interviewsRepo.createSession(userId, promptId, prompt.timeLimitMin);
  },

  async getSession(id: string) {
    const session = await interviewsRepo.getSession(id);
    if (!session) {
      throw new Error('Interview session not found');
    }
    return session;
  },

  async useHint(id: string) {
    const session = await interviewsRepo.getSession(id);
    if (!session) {
      throw new Error('Interview session not found');
    }
    // Limit to maximum available hints
    const maxHints = session.prompt?.hints?.length || 0;
    if (session.hintsUsed >= maxHints) {
      throw new Error('No hints remaining');
    }
    return interviewsRepo.incrementHintsUsed(id);
  },

  async linkDesign(id: string, designId: string) {
    return interviewsRepo.linkDesignToSession(id, designId);
  },

  async submitSession(id: string, design: any) {
    const session = await interviewsRepo.getSession(id);
    if (!session) {
      throw new Error('Interview session not found');
    }

    // Retrieve rubric from prompt
    const rubric = (session.prompt?.rubric as any[]) || [];
    
    // Evaluate design using the scoring engine rules
    const { scoreDesign } = require('./scoring.service');
    const evaluation = scoreDesign(design, rubric);

    // Save evaluation to DB
    const score = await interviewsRepo.saveScore({
      sessionId: id,
      totalScore: evaluation.totalScore,
      rubricResults: evaluation.results,
      missedItems: evaluation.missed,
      aiFeedback: 'AI evaluation queued.' // Placeholder for async AI analysis
    });

    return {
      session,
      score,
      evaluation
    };
  },

  async getUserHistory(userId: string) {
    return interviewsRepo.getHistory(userId);
  }
};
