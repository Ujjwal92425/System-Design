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
 *  - `rateLimit()` is applied per route category: reads (50/min), writes (20/min), bulk (5/hr).
 */

import { Router } from 'express';
import { authorize }    from '../../middleware/authorize';
import { validate }     from '../../middleware/validate';
import { rateLimit }    from '../../middleware/rateLimit';
import { success }      from '../../utils/response';
import { AuthRequest }  from '../../middleware/authenticate';
import { adminService } from './admin.service';
import {
  CreateTrackBody, UpdateTrackBody,
  CreateModuleBody, UpdateModuleBody,
  CreateLessonBody, UpdateLessonBody,
  CreateQuizBody,
  CreateQuestionBody, UpdateQuestionBody,
  AdminUpdateUserBody, AdminCreateUserBody, AdminImportUsersBody,
  AdminCreateBlueprintBody, FeatureBlueprintBody, ReviewReportBody,
  SuspendUserBody,
} from './admin.schema';

export const adminRouter = Router();

const adminReadLimit    = rateLimit({ requests: 50, window: '1m', message: 'Too many admin read requests' });
const adminWriteLimit   = rateLimit({ requests: 20, window: '1m', message: 'Too many admin write operations' });
const adminBulkLimit    = rateLimit({ requests: 5,  window: '1h', message: 'Too many bulk operations' });

const adminOnly = authorize(['ADMIN']);

// ── Platform overview ─────────────────────────────────────────────────────────
adminRouter.get('/overview', adminOnly, adminReadLimit, async (_req: AuthRequest, res, next) => {
  try {
    const stats = await adminService.getPlatformOverview();
    success(res, stats);
  } catch (err) { next(err); }
});

// ── Analytics ─────────────────────────────────────────────────────────────────
adminRouter.get('/analytics/overview', adminOnly, adminReadLimit, async (_req: AuthRequest, res, next) => {
  try {
    const stats = await adminService.getPlatformOverview();
    success(res, stats);
  } catch (err) { next(err); }
});

adminRouter.get('/analytics/events', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const events = await adminService.getRecentEvents(limit);
    success(res, events);
  } catch (err) { next(err); }
});

// ── Tracks ────────────────────────────────────────────────────────────────────
adminRouter.get('/tracks', adminOnly, adminReadLimit, async (_req: AuthRequest, res, next) => {
  try {
    const tracks = await adminService.listAllTracks();
    success(res, tracks);
  } catch (err) { next(err); }
});

adminRouter.post('/tracks', adminOnly, adminWriteLimit, validate(CreateTrackBody), async (req: AuthRequest, res, next) => {
  try {
    const track = await adminService.createTrack(req.body, req.user?.id);
    res.status(201).json({ success: true, data: track });
  } catch (err) { next(err); }
});

adminRouter.get('/tracks/:id', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const track = await adminService.getTrackById(req.params.id);
    success(res, track);
  } catch (err) { next(err); }
});

adminRouter.patch('/tracks/:id', adminOnly, adminWriteLimit, validate(UpdateTrackBody), async (req: AuthRequest, res, next) => {
  try {
    const track = await adminService.updateTrack(req.params.id, req.body, req.user?.id);
    success(res, track);
  } catch (err) { next(err); }
});

adminRouter.delete('/tracks/:id', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteTrack(req.params.id, req.user?.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Modules ───────────────────────────────────────────────────────────────────
adminRouter.post('/modules', adminOnly, adminWriteLimit, validate(CreateModuleBody), async (req: AuthRequest, res, next) => {
  try {
    const mod = await adminService.createModule(req.body, req.user?.id);
    res.status(201).json({ success: true, data: mod });
  } catch (err) { next(err); }
});

adminRouter.patch('/modules/:id', adminOnly, adminWriteLimit, validate(UpdateModuleBody), async (req: AuthRequest, res, next) => {
  try {
    const mod = await adminService.updateModule(req.params.id, req.body, req.user?.id);
    success(res, mod);
  } catch (err) { next(err); }
});

adminRouter.delete('/modules/:id', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteModule(req.params.id, req.user?.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Lessons ───────────────────────────────────────────────────────────────────
adminRouter.get('/lessons', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const page       = parseInt(req.query.page as string)       || 1;
    const limit      = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search     = req.query.search as string | undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const isPublished = req.query.published !== undefined
      ? req.query.published === 'true'
      : undefined;

    const result = await adminService.listAllLessons({ page, limit, search, difficulty, isPublished });
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.post('/lessons', adminOnly, adminWriteLimit, validate(CreateLessonBody), async (req: AuthRequest, res, next) => {
  try {
    const lesson = await adminService.createLesson(req.body, req.user?.id);
    res.status(201).json({ success: true, data: lesson });
  } catch (err) { next(err); }
});

adminRouter.get('/lessons/:id', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const lesson = await adminService.getLessonById(req.params.id);
    success(res, lesson);
  } catch (err) { next(err); }
});

adminRouter.patch('/lessons/:id', adminOnly, adminWriteLimit, validate(UpdateLessonBody), async (req: AuthRequest, res, next) => {
  try {
    const lesson = await adminService.updateLesson(req.params.id, req.body, req.user?.id);
    success(res, lesson);
  } catch (err) { next(err); }
});

adminRouter.delete('/lessons/:id', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteLesson(req.params.id, req.user?.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── Quizzes & Questions ───────────────────────────────────────────────────────
adminRouter.post('/quizzes', adminOnly, adminWriteLimit, validate(CreateQuizBody), async (req: AuthRequest, res, next) => {
  try {
    const quiz = await adminService.createQuiz(req.body, req.user?.id);
    res.status(201).json({ success: true, data: quiz });
  } catch (err) { next(err); }
});

adminRouter.post('/questions', adminOnly, adminWriteLimit, validate(CreateQuestionBody), async (req: AuthRequest, res, next) => {
  try {
    const question = await adminService.createQuestion(req.body, req.user?.id);
    res.status(201).json({ success: true, data: question });
  } catch (err) { next(err); }
});

adminRouter.patch('/questions/:id', adminOnly, adminWriteLimit, validate(UpdateQuestionBody), async (req: AuthRequest, res, next) => {
  try {
    const question = await adminService.updateQuestion(req.params.id, req.body, req.user?.id);
    success(res, question);
  } catch (err) { next(err); }
});

adminRouter.delete('/questions/:id', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    await adminService.deleteQuestion(req.params.id, req.user?.id);
    success(res, { deleted: true });
  } catch (err) { next(err); }
});

// ── User Management ───────────────────────────────────────────────────────────
adminRouter.get('/users', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const page   = parseInt(req.query.page as string) || 1;
    const limit  = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string | undefined;
    const role   = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const result = await adminService.listAllUsers({ page, limit, search, role, status });
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.get('/users/export', adminOnly, adminBulkLimit, async (_req: AuthRequest, res, next) => {
  try {
    const result = await adminService.exportUsersCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
    res.status(200).send(result.csv);
  } catch (err) { next(err); }
});

adminRouter.post('/users', adminOnly, adminWriteLimit, validate(AdminCreateUserBody), async (req: AuthRequest, res, next) => {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

adminRouter.post('/users/import', adminOnly, adminBulkLimit, validate(AdminImportUsersBody), async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.importUsers(req.body.users);
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.get('/users/:id', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    success(res, user);
  } catch (err) { next(err); }
});

adminRouter.patch('/users/:id', adminOnly, adminWriteLimit, validate(AdminUpdateUserBody), async (req: AuthRequest, res, next) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    success(res, user);
  } catch (err) { next(err); }
});

adminRouter.post('/users/:id/suspend', adminOnly, adminWriteLimit, validate(SuspendUserBody), async (req: AuthRequest, res, next) => {
  try {
    const durationMin = req.body.durationMin;
    const result = await adminService.suspendUser(req.params.id, durationMin);
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.post('/users/:id/unsuspend', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.unsuspendUser(req.params.id);
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.delete('/users/:id', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.deleteUser(req.params.id);
    success(res, result);
  } catch (err) { next(err); }
});

// ── Blueprint Moderation ─────────────────────────────────────────────────────
adminRouter.get('/blueprints', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.listAllBlueprints();
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.post('/blueprints', adminOnly, adminWriteLimit, validate(AdminCreateBlueprintBody), async (req: AuthRequest, res, next) => {
  try {
    const bp = await adminService.createBlueprint(req.body, req.user!.id);
    res.status(201).json({ success: true, data: bp });
  } catch (err) { next(err); }
});

adminRouter.patch('/blueprints/:id/feature', adminOnly, adminWriteLimit, validate(FeatureBlueprintBody), async (req: AuthRequest, res, next) => {
  try {
    const bp = await adminService.featureBlueprint(req.params.id, req.body.featured);
    success(res, bp);
  } catch (err) { next(err); }
});

adminRouter.delete('/blueprints/:id', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.removeBlueprint(req.params.id);
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.delete('/blueprints/:id/hard', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.hardDeleteBlueprint(req.params.id);
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.get('/blueprints/:id/comments', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const comments = await adminService.listCommentsForBlueprint(req.params.id);
    success(res, comments);
  } catch (err) { next(err); }
});

adminRouter.delete('/comments/:id', adminOnly, adminWriteLimit, async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.deleteComment(req.params.id);
    success(res, result);
  } catch (err) { next(err); }
});

adminRouter.get('/reports', adminOnly, adminReadLimit, async (req: AuthRequest, res, next) => {
  try {
    const reports = await adminService.listPendingReports();
    success(res, reports);
  } catch (err) { next(err); }
});

adminRouter.patch('/reports/:id/review', adminOnly, adminWriteLimit, validate(ReviewReportBody), async (req: AuthRequest, res, next) => {
  try {
    const result = await adminService.reviewReport(req.params.id, req.body.status);
    success(res, result);
  } catch (err) { next(err); }
});
