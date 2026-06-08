import { Worker } from 'bullmq';
import { env } from '../config/env';

const worker = new Worker('exports', async (job) => {
  // Generate PDF and upload to R2
}, {
  connection: { url: env.REDIS_URL }
});
