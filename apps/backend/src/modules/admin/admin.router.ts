/**
 * apps/backend/src/modules/admin/admin.router.ts
 *
 * All admin CMS API routes.
 *
 * Security model:
 *  - `authenticate` runs at the app level (app.use('/api/admin', authenticate, adminRouter))
 *    so every route here already has a verified JWT.
 *  - `authorize(['ADMIN'])` is added to every route handler so even if mounting
 *    changes, the individual route is still protected.
 *  - `validate()` runs Zod schema before the handler — bad input never reaches the DB.
 *
 * Endpoint map:
 *  GET    /api/admin/overview                    — platform stats
 *  GET    /api/admin/tracks                      — list all tracks (incl. drafts)
 *  POST   /api/admin/tracks                      — create track
 *  GET    /api/admin/tracks/:id                  — track detail + modules + lessons
 *  PATCH  /api/admin/tracks/:id                  — update track
 *  DELETE /api/admin/tracks/:id                  — delete track
 *  POST   /api/admin/modules                     — create module
 *  PATCH  /api/admin/modules/:id                 — update module
 *  DELETE /api/admin/modules/:id                 — delete module
 *  GET    /api/admin/lessons                     — list lessons (paginated, filterable)
 *  POST   /api/admin/lessons                     — create lesson
 *  GET    /api/admin/lessons/:id                 — lesson detail (with full content + quiz)
 *  PATCH  /api/admin/lessons/:id                 — update lesson
 *  DELETE /api/admin/lessons/:id                 — delete lesson
 *  POST   /api/admin/quizzes                     — create quiz for a lesson
 *  POST   /api/admin/questions                   — create question for a quiz
 *  PATCH  /api/admin/questions/:id               — update question
 *  DELETE /api/admin/questions/:id               — delete question
 */

import { Router } from 'express';
import { authorize }    from '../../middleware/authorize';
import { validate }     from '../../middleware/validate';
import { success }      from '../../utils/response';
import { AuthRequest }  from '../../middleware/authenticate';
import { adminService } from './admin.service';
import {
  CreateTrackBody, UpdateTrackBody,
  CreateModuleBody, UpdateModuleBody,
  CreateLessonBody, UpdateLessonBody,
  CreateQuizBody,
  CreateQuestionBody, UpdateQuestionBody,
} from './admin.schema';

export const adminRouter = Router();

// Convenience: every admin route enforces ADMIN role
const adminOnly = authorize(['ADMIN']);

// ── Platform overview ─────────────────────────────────────────────────────────
adminRouter.get('/overview', adminOnly, async (_req: AuthRequest, res, next) => {
  try {
    const stats = await adminService.getPlatformOverview();
    success(res, stats);
  } catch (err) { next(err); }
});

// ── Tracks ────────────────────────────────────────────────────────────────────
adminRouter.get('/tracks', adminOnly, async (_req: AuthRequest, res, next) => {
  try {
    const tracks = await adminService.listAllTracks();
    success(res, tracks);
  } catch (err) { next(err); }
});

adminRouter.post('/tracks', adminOnly, validate(CreateTrackBody), async (req: AuthRequest, res, next) => {
  try {
    const track = await adminService.createTrack(req.body);
    res.status(201).json({ success: true, data: track });
  } catch (err) { next(err); }
});

adminRouter.get('/tracks/:id', adminOnly, async (req: AuthRequest, res, next) => {
  try {
    const track = await adminService.getTrackById(req.params.id);
    success(res, track);
  } catch (err) { next(err); }
});

adminRouter.patch('/tracks/:id', adminOnly, validate(UpdateTrackBody), async (req: AuthRequest, res, next) => {
  try {
    const track = await adminService.updateTrack(req.params.id, req.body);
    success(res, track);
  } catch (err) { next(err); }
});

adminRouter.delete('/tracks/:id', adminOnly, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteTrack(req.params.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Modules ───────────────────────────────────────────────────────────────────
adminRouter.post('/modules', adminOnly, validate(CreateModuleBody), async (req: AuthRequest, res, next) => {
  try {
    const mod = await adminService.createModule(req.body);
    res.status(201).json({ success: true, data: mod });
  } catch (err) { next(err); }
});

adminRouter.patch('/modules/:id', adminOnly, validate(UpdateModuleBody), async (req: AuthRequest, res, next) => {
  try {
    const mod = await adminService.updateModule(req.params.id, req.body);
    success(res, mod);
  } catch (err) { next(err); }
});

adminRouter.delete('/modules/:id', adminOnly, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteModule(req.params.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Lessons ───────────────────────────────────────────────────────────────────
adminRouter.get('/lessons', adminOnly, async (req: AuthRequest, res, next) => {
  try {
    const page       = parseInt(req.query.page as string)       || 1;
    const limit      = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search     = req.query.search as string | undefined;
    const difficulty = req.query.difficulty as string | undefined;
    // Allow filtering by published status: ?published=true|false
    const isPublished = req.query.published !== undefined
      ? req.query.published === 'true'
      : undefined;

    const result = await adminService.listAllLessons({ page, limit, search, difficulty, isPublished });
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.post('/lessons', adminOnly, validate(CreateLessonBody), async (req: AuthRequest, res, next) => {
  try {
    const lesson = await adminService.createLesson(req.body);
    res.status(201).json({ success: true, data: lesson });
  } catch (err) { next(err); }
});

adminRouter.get('/lessons/:id', adminOnly, async (req: AuthRequest, res, next) => {
  try {
    const lesson = await adminService.getLessonById(req.params.id);
    success(res, lesson);
  } catch (err) { next(err); }
});

adminRouter.patch('/lessons/:id', adminOnly, validate(UpdateLessonBody), async (req: AuthRequest, res, next) => {
  try {
    const lesson = await adminService.updateLesson(req.params.id, req.body);
    success(res, lesson);
  } catch (err) { next(err); }
});

adminRouter.delete('/lessons/:id', adminOnly, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteLesson(req.params.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Quizzes & Questions ───────────────────────────────────────────────────────
adminRouter.post('/quizzes', adminOnly, validate(CreateQuizBody), async (req: AuthRequest, res, next) => {
  try {
    const quiz = await adminService.createQuiz(req.body);
    res.status(201).json({ success: true, data: quiz });
  } catch (err) { next(err); }
});

adminRouter.post('/questions', adminOnly, validate(CreateQuestionBody), async (req: AuthRequest, res, next) => {
  try {
    const question = await adminService.createQuestion(req.body);
    res.status(201).json({ success: true, data: question });
  } catch (err) { next(err); }
});

adminRouter.patch('/questions/:id', adminOnly, validate(UpdateQuestionBody), async (req: AuthRequest, res, next) => {
  try {
    const question = await adminService.updateQuestion(req.params.id, req.body);
    success(res, question);
  } catch (err) { next(err); }
});

adminRouter.delete('/questions/:id', adminOnly, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteQuestion(req.params.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});
