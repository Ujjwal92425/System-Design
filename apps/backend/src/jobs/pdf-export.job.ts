/**
 * apps/backend/src/jobs/pdf-export.job.ts
 *
 * BullMQ worker for PDF exports.
 * Skipped entirely when DISABLE_QUEUES is set.
 */

import type { Job } from 'bullmq';
import { logger } from '../utils/logger';

const queuesEnabled = !process.env.DISABLE_QUEUES || process.env.DISABLE_QUEUES === 'false';

if (queuesEnabled) {
  const { Worker } = require('bullmq');
  const { env } = require('../config/env');

  const worker = new Worker('exports', async (job: Job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing PDF export job');
  }, {
    connection: { url: env.REDIS_URL },
    concurrency: 1,
  });

  worker.on('completed', (job: Job) => {
    logger.info({ jobId: job.id }, 'PDF export job completed');
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'PDF export job failed');
  });

  logger.info('PDF export worker registered');
} else {
  logger.info('PDF export worker skipped (DISABLE_QUEUES=true)');
}
