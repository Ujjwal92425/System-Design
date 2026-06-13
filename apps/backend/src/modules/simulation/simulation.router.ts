/**
 * apps/backend/src/modules/simulation/simulation.router.ts
 *
 * REST API for the Simulation module.
 *
 * All routes require a valid JWT (enforced at app.use level).
 * Simulation configs are scoped to designs; ownership is verified
 * at the service layer to prevent IDOR.
 *
 * CHANGE: Implemented from stub — full CRUD for simulation configs
 *          and run management.
 */

import { Router } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { validate, validateQuery } from '../../middleware/validate';
import { success, created, noContent } from '../../utils/response';
import { simulationService } from './simulation.service';
import {
  SaveSimConfigBody,
  SaveSimRunBody,
  ListRunsQuery,
} from './simulation.schema';

export const simulationRouter = Router();

// ── List simulation configs for a design ────────────────────────────────
simulationRouter.get('/configs/:designId', async (req: AuthRequest, res, next) => {
  try {
    const list = await simulationService.listConfigs(req.params.designId, req.user!.id);
    success(res, list);
  } catch (err) { next(err); }
});

// ── Save a new simulation configuration ────────────────────────────────
simulationRouter.post('/configs', validate(SaveSimConfigBody), async (req: AuthRequest, res, next) => {
  try {
    const { designId, config } = req.body;
    const sim = await simulationService.saveConfig(designId, req.user!.id, config);
    created(res, sim);
  } catch (err) { next(err); }
});

// ── Delete a simulation config ─────────────────────────────────────────
simulationRouter.delete('/configs/:id', async (req: AuthRequest, res, next) => {
  try {
    await simulationService.deleteConfig(req.params.id, req.user!.id);
    noContent(res);
  } catch (err) { next(err); }
});

// ── Start a new simulation run ─────────────────────────────────────────
simulationRouter.post('/runs/:simulationId/start', async (req: AuthRequest, res, next) => {
  try {
    const run = await simulationService.startRun(req.params.simulationId, req.user!.id);
    created(res, run);
  } catch (err) { next(err); }
});

// ── Complete a simulation run (save metrics) ──────────────────────────
simulationRouter.patch('/runs/:runId/complete', validate(SaveSimRunBody), async (req: AuthRequest, res, next) => {
  try {
    const run = await simulationService.completeRun(req.params.runId, req.user!.id, req.body);
    success(res, run);
  } catch (err) { next(err); }
});

// ── List simulation runs ──────────────────────────────────────────────
simulationRouter.get('/runs', validateQuery(ListRunsQuery), async (req: AuthRequest, res, next) => {
  try {
    const { page, limit, designId } = req.query as any;
    const result = await simulationService.listRuns({
      page,
      limit,
      designId,
      userId: req.user!.id,
    });
    success(res, result.items, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (err) { next(err); }
});

// ── Get a single simulation run ───────────────────────────────────────
simulationRouter.get('/runs/:runId', async (req: AuthRequest, res, next) => {
  try {
    const run = await simulationService.getRun(req.params.runId, req.user!.id);
    success(res, run);
  } catch (err) { next(err); }
});
