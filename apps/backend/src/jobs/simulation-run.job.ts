import { Job, Worker } from 'bullmq';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { simulationService } from '../modules/simulation/simulation.service';
import { TickSnapshot } from '@sd-os/simulation-engine';

const worker = new Worker('simulation-run', async (job: Job) => {
  const { simulationId, userId } = job.data;
  logger.info({ jobId: job.id, simulationId, userId }, 'Starting background simulation run');

  try {
    const allTicks: TickSnapshot[] = [];

    const result = await simulationService.startRun(simulationId, userId, (tick: TickSnapshot) => {
      allTicks.push(tick);
      job.updateProgress({ tick: tick.tick, totalNodes: tick.nodes.length, health: tick.systemHealth });
    });

    await job.updateProgress({ ticks: allTicks.length, status: 'completed' });
    logger.info({ jobId: job.id, simulationId, ticks: allTicks.length }, 'Background simulation completed');

    return { ticksCount: allTicks.length, runId: result.run.id };

  } catch (err: any) {
    logger.error({ jobId: job.id, simulationId, err }, 'Background simulation failed');
    throw err;
  }
}, {
  connection: { url: env.REDIS_URL },
  concurrency: 2,
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Simulation job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Simulation job failed');
});

export { worker as simulationRunWorker };
