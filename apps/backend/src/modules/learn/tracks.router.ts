import { Router } from 'express';
import { success } from '../../utils/response';
import { learnService } from './learn.service';
import { validate } from '../../middleware/validate';
import { LessonStateBody, BookmarkBody, QuizAttemptBody } from './learn.schema';
import { AuthRequest } from '../../middleware/authenticate';

export const learnRouter = Router();

// ─── TRACKS ──────────────────────────────────────────────────────────────────
learnRouter.get('/tracks', async (req: AuthRequest, res, next) => {
  try {
    const tracks = await learnService.listTracks(req.user!.id);
    success(res, tracks);
  } catch (err) {
    next(err);
  }
});

learnRouter.get('/tracks/:slug', async (req: AuthRequest, res, next) => {
  try {
    const track = await learnService.getTrackDetail(req.params.slug, req.user!.id);
    success(res, track);
  } catch (err) {
    next(err);
  }
});

// ─── LESSONS ─────────────────────────────────────────────────────────────────
// Search lessons (reloaded)
learnRouter.get('/lessons/search', async (req: AuthRequest, res, next) => {
  try {
    const query = (req.query.q as string) || '';
    const difficulty = req.query.difficulty as string;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

    const lessons = await learnService.searchLessons(req.user!.id, query, { difficulty, tags });
    success(res, lessons);
  } catch (err) {
    next(err);
  }
});

// Get single lesson details
learnRouter.get('/lessons/:slug', async (req: AuthRequest, res, next) => {
  try {
    const lesson = await learnService.getLessonDetail(req.params.slug, req.user!.id);
    success(res, lesson);
  } catch (err) {
    next(err);
  }
});

// ─── PROGRESS ────────────────────────────────────────────────────────────────
// Update reading state / completed status
learnRouter.post('/progress/state', validate(LessonStateBody), async (req: AuthRequest, res, next) => {
  try {
    const { lessonId, status, resumeState, notes } = req.body;
    const state = await learnService.updateLessonState(req.user!.id, lessonId, {
      status,
      resumeState,
      notes
    });
    success(res, state);
  } catch (err) {
    next(err);
  }
});

// Toggle bookmark
learnRouter.post('/progress/bookmark', validate(BookmarkBody), async (req: AuthRequest, res, next) => {
  try {
    const { lessonId, bookmarked } = req.body;
    const state = await learnService.toggleBookmark(req.user!.id, lessonId, bookmarked);
    success(res, state);
  } catch (err) {
    next(err);
  }
});

// ─── QUIZZES ─────────────────────────────────────────────────────────────────
// Submit quiz attempt
learnRouter.post('/quizzes/:id/attempt', validate(QuizAttemptBody), async (req: AuthRequest, res, next) => {
  try {
    const result = await learnService.submitQuizAttempt(req.user!.id, req.params.id, req.body.answers);
    success(res, result);
  } catch (err) {
    next(err);
  }
});
