import { FallbackProvider } from './providers/fallback.provider';
import { aiQueue } from '../../jobs/queues';

const fallback = new FallbackProvider();

export const aiService = {
  async analyze(design: any) {
    // If Anthropic/OpenAI keys are present, we'd invoke them. Otherwise we fallback.
    return fallback.analyze(design);
  },

  async queueAnalysis(designId: string, userId: string) {
    const job = await aiQueue.add('analyze', { designId, userId });
    return job.id;
  }
};
