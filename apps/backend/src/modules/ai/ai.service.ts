import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { FallbackProvider } from './providers/fallback.provider';
import { aiQueue } from '../../jobs/queues';
import { logger } from '../../utils/logger';
import type { InterviewPrompt, RubricCriteria } from '@sd-os/shared';

const anthropic = new AnthropicProvider();
const openai = new OpenAIProvider();
const fallback = new FallbackProvider();

import { env } from '../../config/env';

const PREFERRED_PROVIDER = env.AI_PROVIDER || 'fallback';

async function callProvider(design: any, interviewContext?: {
  prompt?: InterviewPrompt;
  rubric?: RubricCriteria[];
}) {
  switch (PREFERRED_PROVIDER) {
    case 'anthropic':
      return anthropic.analyze(design, interviewContext);
    case 'openai':
      return openai.analyze(design, interviewContext);
    default:
      return fallback.analyze(design, interviewContext);
  }
}

export const aiService = {
  async analyze(design: any) {
    const startTime = Date.now();
    let result;

    try {
      result = await callProvider(design);
    } catch (err: any) {
      logger.error({ err: err.message, provider: PREFERRED_PROVIDER }, 'AI provider failed, using fallback');
      result = await fallback.analyze(design);
    }

    const duration = Date.now() - startTime;
    logger.info({ provider: PREFERRED_PROVIDER, durationMs: duration }, 'AI analysis completed');

    return result;
  },

  async analyzeInterviewDesign(design: any, interviewContext: {
    prompt?: InterviewPrompt;
    rubric?: RubricCriteria[];
  }) {
    const startTime = Date.now();
    let result;

    try {
      result = await callProvider(design, interviewContext);
    } catch (err: any) {
      logger.error({ err: err.message, provider: PREFERRED_PROVIDER }, 'AI interview analysis failed, using fallback');
      result = await fallback.analyze(design);
    }

    const duration = Date.now() - startTime;
    logger.info({ provider: PREFERRED_PROVIDER, durationMs: duration }, 'AI interview analysis completed');

    return result;
  },

  async queueAnalysis(designId: string, userId: string) {
    const job = await aiQueue.add('analyze', { designId, userId });
    return job.id;
  },
};
