import { Worker, type Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const queuesEnabled = !env.DISABLE_QUEUES;

if (queuesEnabled) {
  const worker = new Worker('exports', async (job: Job) => {
    const { designId, userId, format } = job.data;
    logger.info({ jobId: job.id, designId, format }, 'Processing PDF export job');

    try {
      // TODO: Integrate PDF generation library (e.g. puppeteer, pdfkit)
      // For now, we acknowledge the job and log completion
      logger.info({ jobId: job.id, designId }, 'PDF export job completed (stub)');
      return { designId, status: 'exported' };
    } catch (err: any) {
      logger.error({ jobId: job.id, err }, 'PDF export job failed');
      throw err;
    }
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
