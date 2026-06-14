/**
 * apps/backend/src/jobs/ai-analysis.job.ts
 *
 * BullMQ worker for AI analysis jobs.
 * Skipped entirely when DISABLE_QUEUES is set.
 */

import type { Job } from 'bullmq';
import { logger } from '../utils/logger';

const queuesEnabled = !process.env.DISABLE_QUEUES || process.env.DISABLE_QUEUES === 'false';

if (queuesEnabled) {
  const { Worker } = require('bullmq');
  const { env } = require('../config/env');

  const worker = new Worker('ai-analysis', async (job: Job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing AI Analysis job');
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
