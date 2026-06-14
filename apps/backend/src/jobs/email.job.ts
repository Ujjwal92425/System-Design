/**
 * apps/backend/src/jobs/email.job.ts
 *
 * BullMQ worker for email sending.
 * Skipped entirely when DISABLE_QUEUES is set.
 */

import type { Job } from 'bullmq';
import { logger } from '../utils/logger';

const queuesEnabled = !process.env.DISABLE_QUEUES || process.env.DISABLE_QUEUES === 'false';

if (queuesEnabled) {
  const { Worker } = require('bullmq');
  const { env } = require('../config/env');

  const worker = new Worker('emails', async (job: Job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing email job');
  }, {
    connection: { url: env.REDIS_URL },
    concurrency: 1,
  });

  worker.on('completed', (job: Job) => {
    logger.info({ jobId: job.id }, 'Email job completed');
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed');
  });

  logger.info('Email worker registered');
} else {
  logger.info('Email worker skipped (DISABLE_QUEUES=true)');
}
