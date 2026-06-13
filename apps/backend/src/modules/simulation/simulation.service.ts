/**
 * apps/backend/src/modules/simulation/simulation.service.ts
 *
 * Business logic for the Simulation module.
 *
 * Manages simulation configurations and run history.
 * Each simulation config is tied to a design; each "Start" creates a run.
 *
 * CHANGE: Implemented from stub — full CRUD for simulation configs
 *          and time-series metrics storage.
 */

import { db } from '@sd-os/db';
import { AppError } from '../../utils/errors';

export const simulationService = {

  /**
   * List saved simulation configs for a design.
   */
  async listConfigs(designId: string, userId: string) {
    // Verify ownership first
    const design = await db.design.findFirst({
      where: { id: designId, userId, deletedAt: null },
    });
    if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);

    return db.simulation.findMany({
      where: { designId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    });
  },

  /**
   * Save a new simulation configuration for a design.
   */
  async saveConfig(designId: string, userId: string, config: any) {
    const design = await db.design.findFirst({
      where: { id: designId, userId, deletedAt: null },
    });
    if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);

    return db.simulation.create({
      data: { designId, config },
    });
  },

  /**
   * Start a simulation run — creates a new run record.
   */
  async startRun(simulationId: string, userId: string) {
    const sim = await db.simulation.findUnique({
      where: { id: simulationId },
      include: { design: { select: { userId: true } } },
    });
    if (!sim) throw new AppError('NOT_FOUND', 'Simulation config not found', 404);
    if (sim.design.userId !== userId) throw new AppError('FORBIDDEN', 'Access denied', 403);

    return db.simulationRun.create({
      data: {
        simulationId,
        startedAt: new Date(),
      },
    });
  },

  /**
   * Complete a simulation run — saves final metrics and duration.
   */
  async completeRun(runId: string, userId: string, data: {
    durationSec: number;
    metrics: any[];
    events?: any[];
  }) {
    const run = await db.simulationRun.findUnique({
      where: { id: runId },
      include: {
        simulation: {
          include: { design: { select: { userId: true } } },
        },
      },
    });
    if (!run) throw new AppError('NOT_FOUND', 'Simulation run not found', 404);
    if (run.simulation.design.userId !== userId) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }

    return db.simulationRun.update({
      where: { id: runId },
      data: {
        endedAt: new Date(),
        durationSec: data.durationSec,
        metrics: data.metrics,
        events: data.events || [],
      },
    });
  },

  /**
   * List simulation runs with pagination.
   */
  async listRuns(params: {
    page: number;
    limit: number;
    designId?: string;
    userId: string;
  }) {
    const { page, limit, designId, userId } = params;
    const where: any = {};

    if (designId) {
      // Verify ownership of the design
      const design = await db.design.findFirst({
        where: { id: designId, userId, deletedAt: null },
      });
      if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);
      where.simulation = { designId };
    } else {
      // List runs across all user's designs
      where.simulation = {
        design: { userId, deletedAt: null },
      };
    }

    const [items, total] = await Promise.all([
      db.simulationRun.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          simulation: {
            select: {
              id: true,
              designId: true,
              config: true,
            },
          },
        },
      }),
      db.simulationRun.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  /**
   * Get a single simulation run with full metrics.
   */
  async getRun(runId: string, userId: string) {
    const run = await db.simulationRun.findUnique({
      where: { id: runId },
      include: {
        simulation: {
          include: { design: { select: { userId: true, title: true } } },
        },
      },
    });
    if (!run) throw new AppError('NOT_FOUND', 'Simulation run not found', 404);
    if (run.simulation.design.userId !== userId) {
      throw new AppError('FORBIDDEN', 'Access denied', 403);
    }
    return run;
  },

  /**
   * Delete a simulation config and its runs.
   */
  async deleteConfig(id: string, userId: string) {
    const sim = await db.simulation.findUnique({
      where: { id },
      include: { design: { select: { userId: true } } },
    });
    if (!sim) throw new AppError('NOT_FOUND', 'Simulation config not found', 404);
    if (sim.design.userId !== userId) throw new AppError('FORBIDDEN', 'Access denied', 403);

    await db.simulation.delete({ where: { id } });
    return { deleted: true };
  },
};
