import { db } from '@sd-os/db';
import { AppError } from '../../utils/errors';
import { SimulationEngine, TickSnapshot, SimulationConfig } from '@sd-os/simulation-engine';

interface ActiveSimulation {
  engine: SimulationEngine;
  runId: string;
  userId: string;
  designId: string;
  onTick?: (tick: TickSnapshot) => void;
}

const activeSimulations = new Map<string, ActiveSimulation>();

export const simulationService = {
  async listConfigs(designId: string, userId: string) {
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

  async saveConfig(designId: string, userId: string, config: any) {
    const design = await db.design.findFirst({
      where: { id: designId, userId, deletedAt: null },
    });
    if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);

    return db.simulation.create({
      data: { designId, config },
    });
  },

  async startRun(
    simulationId: string,
    userId: string,
    onTick?: (tick: TickSnapshot) => void,
  ): Promise<{ run: any; ticks: TickSnapshot[] }> {
    const sim = await db.simulation.findUnique({
      where: { id: simulationId },
      include: {
        design: {
          select: { userId: true, id: true },
          include: {
            versions: { orderBy: { version: 'desc' as const }, take: 1 },
          },
        },
      },
    });
    if (!sim) throw new AppError('NOT_FOUND', 'Simulation config not found', 404);
    if (sim.design.userId !== userId) throw new AppError('FORBIDDEN', 'Access denied', 403);

    const config = sim.config as unknown as SimulationConfig;
    const latestVersion = sim.design.versions[0];
    const nodes = (latestVersion?.nodes as any[]) || [];
    const edges = (latestVersion?.edges as any[]) || [];

    const run = await db.simulationRun.create({
      data: { simulationId, startedAt: new Date() },
    });

    const engine = new SimulationEngine(nodes, edges, config);
    const ticks: TickSnapshot[] = [];

    engine.start(
      (tick) => {
        ticks.push(tick);
        if (onTick) onTick(tick);
      },
      async (history) => {
        const durationSec = history.length > 0
          ? Math.round((Date.now() - new Date(run.startedAt).getTime()) / 1000)
          : 0;

        await db.simulationRun.update({
          where: { id: run.id },
          data: {
            endedAt: new Date(),
            durationSec,
            metrics: history as any,
            events: history.flatMap((h) => h.events) as any,
          },
        });

        activeSimulations.delete(run.id);
      },
    );

    activeSimulations.set(run.id, { engine, runId: run.id, userId, designId: sim.designId, onTick });

    return { run, ticks };
  },

  async stopRun(runId: string, userId: string): Promise<TickSnapshot[]> {
    const active = activeSimulations.get(runId);
    if (!active) throw new AppError('NOT_FOUND', 'Active simulation run not found', 404);
    if (active.userId !== userId) throw new AppError('FORBIDDEN', 'Access denied', 403);

    const history = active.engine.stop();
    activeSimulations.delete(runId);
    return history;
  },

  getActiveRun(runId: string, userId: string): ActiveSimulation | undefined {
    const active = activeSimulations.get(runId);
    if (active && active.userId !== userId) return undefined;
    return active;
  },

  async injectChaos(runId: string, userId: string, nodeId: string, mode: string, severity?: number) {
    const active = activeSimulations.get(runId);
    if (!active) throw new AppError('NOT_FOUND', 'Active simulation run not found', 404);
    if (active.userId !== userId) throw new AppError('FORBIDDEN', 'Access denied', 403);

    const event = active.engine.injectChaos(
      nodeId,
      mode as any,
      active.engine.getTickCount(),
      severity,
    );
    return event;
  },

  async healChaos(runId: string, userId: string, nodeId: string) {
    const active = activeSimulations.get(runId);
    if (!active) throw new AppError('NOT_FOUND', 'Active simulation run not found', 404);
    if (active.userId !== userId) throw new AppError('FORBIDDEN', 'Access denied', 403);

    active.engine.healChaos(nodeId);
    return { healed: true };
  },

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

  async listRuns(params: {
    page: number;
    limit: number;
    designId?: string;
    userId: string;
  }) {
    const { page, limit, designId, userId } = params;
    const where: any = {};

    if (designId) {
      const design = await db.design.findFirst({
        where: { id: designId, userId, deletedAt: null },
      });
      if (!design) throw new AppError('NOT_FOUND', 'Design not found', 404);
      where.simulation = { designId };
    } else {
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
            select: { id: true, designId: true, config: true },
          },
        },
      }),
      db.simulationRun.count({ where }),
    ]);

    return { items, total, page, limit };
  },

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
