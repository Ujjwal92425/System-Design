import { Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const worker = new Worker('ai-analysis', async (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Processing AI Analysis job');
  // AI analysis business logic runs here
}, {
  connection: { url: env.REDIS_URL }
});
