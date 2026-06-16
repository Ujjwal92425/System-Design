import { Router } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { validate, validateQuery } from '../../middleware/validate';
import { success, created, noContent } from '../../utils/response';
import { simulationService } from './simulation.service';
import {
  SaveSimConfigBody,
  SaveSimRunBody,
  ListRunsQuery,
  ChaosInjectBody,
} from './simulation.schema';

export const simulationRouter = Router();

simulationRouter.get('/configs/:designId', async (req: AuthRequest, res, next) => {
  try {
    const list = await simulationService.listConfigs(req.params.designId, req.user!.id);
    success(res, list);
  } catch (err) { next(err); }
});

simulationRouter.post('/configs', validate(SaveSimConfigBody), async (req: AuthRequest, res, next) => {
  try {
    const { designId, config } = req.body;
    const sim = await simulationService.saveConfig(designId, req.user!.id, config);
    created(res, sim);
  } catch (err) { next(err); }
});

simulationRouter.delete('/configs/:id', async (req: AuthRequest, res, next) => {
  try {
    await simulationService.deleteConfig(req.params.id, req.user!.id);
    noContent(res);
  } catch (err) { next(err); }
});

simulationRouter.post('/runs/:simulationId/start', async (req: AuthRequest, res, next) => {
  try {
    const result = await simulationService.startRun(req.params.simulationId, req.user!.id);
    created(res, { run: result.run, initialTick: result.ticks[0] || null });
  } catch (err) { next(err); }
});

simulationRouter.post('/runs/:runId/stop', async (req: AuthRequest, res, next) => {
  try {
    const history = await simulationService.stopRun(req.params.runId, req.user!.id);
    success(res, { ticks: history });
  } catch (err) { next(err); }
});
simulationRouter.post('/runs/:runId/chaos', validate(ChaosInjectBody), async (req: AuthRequest, res, next) => {
  try {
    const { nodeId, mode, severity } = req.body;
    const event = await simulationService.injectChaos(req.params.runId, req.user!.id, nodeId, mode, severity);
    success(res, event);
  } catch (err) { next(err); }
});

simulationRouter.post('/runs/:runId/heal', async (req: AuthRequest, res, next) => {
  try {
    const result = await simulationService.healChaos(req.params.runId, req.user!.id, req.body.nodeId);
    success(res, result);
  } catch (err) { next(err); }
});

simulationRouter.patch('/runs/:runId/complete', validate(SaveSimRunBody), async (req: AuthRequest, res, next) => {
  try {
    const run = await simulationService.completeRun(req.params.runId, req.user!.id, req.body);
    success(res, run);
  } catch (err) { next(err); }
});

simulationRouter.get('/runs', validateQuery(ListRunsQuery), async (req: AuthRequest, res, next) => {
  try {
    const { page, limit, designId } = req.query as any;
    const result = await simulationService.listRuns({ page, limit, designId, userId: req.user!.id });
    success(res, result.items, 200, { page: result.page, limit: result.limit, total: result.total });
  } catch (err) { next(err); }
});

simulationRouter.get('/runs/:runId', async (req: AuthRequest, res, next) => {
  try {
    const run = await simulationService.getRun(req.params.runId, req.user!.id);
    success(res, run);
  } catch (err) { next(err); }
});
