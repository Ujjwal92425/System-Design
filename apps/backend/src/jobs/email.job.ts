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

  function buildEmailContent(data: { type?: string; token?: string; name?: string; text?: string; html?: string }): { text: string; html: string } {
    if (data.text && data.html) return { text: data.text, html: data.html };

    const baseUrl = env.FRONTEND_URL;
    switch (data.type) {
      case 'verification':
        return {
          text: `Hi ${data.name || 'there'},\n\nPlease verify your email by visiting: ${baseUrl}/verify-email?token=${data.token}\n\nThis link expires in 24 hours.`,
          html: `<p>Hi ${data.name || 'there'},</p><p>Please verify your email by <a href="${baseUrl}/verify-email?token=${data.token}">clicking here</a>.</p><p>This link expires in 24 hours.</p>`,
        };
      case 'reset-password':
        return {
          text: `Hi ${data.name || 'there'},\n\nReset your password by visiting: ${baseUrl}/reset-password?token=${data.token}\n\nThis link expires in 1 hour.`,
          html: `<p>Hi ${data.name || 'there'},</p><p>Reset your password by <a href="${baseUrl}/reset-password?token=${data.token}">clicking here</a>.</p><p>This link expires in 1 hour.</p>`,
        };
      default:
        return { text: 'No content', html: '<p>No content</p>' };
    }
  }

  const worker = new Worker('emails', async (job: Job) => {
    const { to, subject } = job.data;
    const { text, html } = buildEmailContent(job.data);
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

  worker.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed');
  });

  logger.info('Email worker registered');
} else {
  logger.info('Email worker skipped (DISABLE_QUEUES=true)');
}
