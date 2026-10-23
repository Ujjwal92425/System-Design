import { Worker, type Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

const queuesEnabled = !env.DISABLE_QUEUES;

if (queuesEnabled) {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'localhost',
    port: env.SMTP_PORT || 587,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
    secure: false,
  });

  const worker = new Worker('emails', async (job: Job) => {
    const { to, subject, text, html } = job.data;
    logger.info({ jobId: job.id, to, subject }, 'Processing email job');

    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });
      logger.info({ jobId: job.id, to }, 'Email sent successfully');
    } catch (err: any) {
      logger.error({ jobId: job.id, err }, 'Email send failed');
      throw err;
    }
  }, {
    connection: { url: env.REDIS_URL },
    concurrency: 1,
  });

  worker.on('completed', (job: Job) => {
    logger.info({ jobId: job.id }, 'Email job completed');
  });

  // CHANGE: Suppress unhandled Redis connection error crash
  worker.on('error', (err: Error) => {
    logger.warn({ err: err.message }, 'Email worker Redis connection warning');
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed');
  });

  logger.info('Email worker registered');
} else {
  logger.info('Email worker skipped (DISABLE_QUEUES=true)');
}
