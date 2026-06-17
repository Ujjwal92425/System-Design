/**
 * apps/backend/src/modules/designs/designs.router.ts
 *
 * REST API for the Build canvas module.
 *
 * All routes require a valid JWT (enforced at app.use level).
 * Ownership of individual designs is validated inside the service/repo layer
 * so there's no risk of IDOR (a user accessing another user's design).
 *
 * Public route (no auth):
 *   GET /api/designs/public/:id  — shareable read-only link
 */

import { Router }          from 'express';
import { AuthRequest }     from '../../middleware/authenticate';
import { optionalAuthenticate } from '../../middleware/authenticate';
import { validate }        from '../../middleware/validate';
import { success }         from '../../utils/response';
import { designsService }  from './designs.service';
import {
  CreateDesignBody,
  SaveDesignBody,
  UpdateDesignMetaBody,
  RestoreVersionBody,
} from './designs.schema';

export const designsRouter = Router();

// ── List user's designs ───────────────────────────────────────────────────────
designsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const list = await designsService.listDesigns(req.user!.id);
    success(res, list);
  } catch (err) { next(err); }
});

// ── List templates ────────────────────────────────────────────────────────────
designsRouter.get('/templates', async (req: AuthRequest, res, next) => {
  try {
    const list = await designsService.listTemplates();
    success(res, list);
  } catch (err) { next(err); }
});

// ── Create a new design ───────────────────────────────────────────────────────
designsRouter.post('/', validate(CreateDesignBody), async (req: AuthRequest, res, next) => {
  try {
    const { title, templateId, nodes, edges } = req.body;
    const design = await designsService.createDesign(
      req.user!.id,
      req.user!.role,
      title,
      templateId,
      nodes,
      edges,
    );
    res.status(201).json({ success: true, data: design });
  } catch (err) { next(err); }
});

// ── Public shareable link (NO auth required) ──────────────────────────────────
// Must be before /:id to avoid being swallowed by the dynamic segment
designsRouter.get('/public/:id', optionalAuthenticate, async (req: AuthRequest, res, next) => {
  try {
    const design = await designsService.getPublicDesign(req.params.id);
    success(res, design);
  } catch (err) { next(err); }
});

// ── Get a single design for the canvas editor ─────────────────────────────────
designsRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const design = await designsService.getDesignForEditor(req.params.id, req.user!.id);
    success(res, design);
  } catch (err) { next(err); }
});

// ── Update metadata (title, description, visibility) ─────────────────────────
designsRouter.patch('/:id', validate(UpdateDesignMetaBody), async (req: AuthRequest, res, next) => {
  try {
    const design = await designsService.updateMeta(req.params.id, req.user!.id, req.body);
    success(res, design);
  } catch (err) { next(err); }
});

// ── Save a new version snapshot ───────────────────────────────────────────────
designsRouter.post('/:id/save', validate(SaveDesignBody), async (req: AuthRequest, res, next) => {
  try {
    const version = await designsService.saveDesign(req.params.id, req.user!.id, req.body);
    success(res, version);
  } catch (err) { next(err); }
});

// ── Restore a specific version ────────────────────────────────────────────────
designsRouter.post('/:id/restore', validate(RestoreVersionBody), async (req: AuthRequest, res, next) => {
  try {
    const version = await designsService.restoreVersion(
      req.params.id,
      req.user!.id,
      req.body.version,
    );
    success(res, version);
  } catch (err) { next(err); }
});

// ── Soft-delete a design ──────────────────────────────────────────────────────
designsRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await designsService.deleteDesign(req.params.id, req.user!.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});
