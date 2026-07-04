import { Worker, type Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { aiService } from '../modules/ai/ai.service';

const queuesEnabled = !env.DISABLE_QUEUES;

if (queuesEnabled) {
  const worker = new Worker('ai-analysis', async (job: Job) => {
    const { designId, userId, design } = job.data;
    logger.info({ jobId: job.id, designId, userId }, 'Processing AI Analysis job');

    try {
      const result = await aiService.analyze({ designId, userId, nodes: design?.nodes, edges: design?.edges });
      logger.info({ jobId: job.id, result }, 'AI Analysis job completed successfully');
      return result;
    } catch (err: any) {
      logger.error({ jobId: job.id, err }, 'AI Analysis job failed');
      throw err;
    }
  }, {
    connection: { url: env.REDIS_URL },
    concurrency: 2,
  });

  worker.on('completed', (job: Job) => {
    logger.info({ jobId: job.id }, 'AI Analysis job completed');
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'AI Analysis job failed');
  });

  logger.info('AI Analysis worker registered');
} else {
  logger.info('AI Analysis worker skipped (DISABLE_QUEUES=true)');
}
