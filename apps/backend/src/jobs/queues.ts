import { Queue } from 'bullmq';
import { env } from '../config/env';

export const aiQueue = new Queue('ai-analysis', {
  connection: { url: env.REDIS_URL }
});

export const exportQueue = new Queue('exports', {
  connection: { url: env.REDIS_URL }
});

export const emailQueue = new Queue('emails', {
  connection: { url: env.REDIS_URL }
});
