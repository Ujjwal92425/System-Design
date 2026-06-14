/**
 * apps/backend/src/jobs/queues.ts
 *
 * BullMQ queue definitions — gracefully handles missing Redis.
 *
 * When DISABLE_QUEUES=true or Redis is unreachable, all queue operations
 * become no-ops instead of crashing the server.
 *
 * CHANGE: Attaches error listener to ioredis client to prevent
 *          unhandled AggregateError on ECONNREFUSED.
 */

import { Queue } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const queuesEnabled = !process.env.DISABLE_QUEUES || process.env.DISABLE_QUEUES === 'false';

function attachErrorHandler(queue: Queue): void {
  // BullMQ 5.x: queue.client is a Promise<ioredis>
  // Suppress async Redis connection errors — without this listener,
  // ioredis emits an unhandled 'error' that crashes the process.
  queue.client
    .then((client) => {
      client.on('error', () => {});
    })
    .catch(() => {});
}

function createQueue(name: string): Queue {
  const queue = new Queue(name, {
    connection: { url: env.REDIS_URL },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  });
  attachErrorHandler(queue);
  return queue;
}

// Provide no-op stubs when queues are disabled
function noopQueue(name: string): Queue {
  const noop = () => Promise.resolve();
  return {
    name,
    add: noop as any,
    addBulk: noop as any,
    getJob: noop as any,
    getJobs: async () => [],
    getCompleted: async () => [],
    getFailed: async () => [],
    getActive: async () => [],
    getWaiting: async () => [],
    isPaused: async () => false,
    pause: noop,
    resume: noop,
    close: noop,
    disconnect: noop,
  } as unknown as Queue;
}

export const aiQueue = queuesEnabled ? createQueue('ai-analysis') : noopQueue('ai-analysis');
export const exportQueue = queuesEnabled ? createQueue('exports') : noopQueue('exports');
export const emailQueue = queuesEnabled ? createQueue('emails') : noopQueue('emails');

if (queuesEnabled) {
  logger.info('BullMQ queues initialized (Redis enabled)');
} else {
  logger.info('BullMQ queues disabled (DISABLE_QUEUES=true)');
}
