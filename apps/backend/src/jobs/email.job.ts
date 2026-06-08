import { Worker } from 'bullmq';
import { env } from '../config/env';

const worker = new Worker('emails', async (job) => {
  // Dispatch transactional emails via Resend
}, {
  connection: { url: env.REDIS_URL }
});
