import { Router } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { success } from '../../utils/response';
import { Errors } from '../../utils/errors';
import { interviewService } from './interview.service';
import { StartSessionBody, LinkDesignBody, SubmitSessionBody } from './interview.schema';

export const interviewRouter = Router();

// 1. Get List of Prompts
interviewRouter.get('/prompts', async (req: AuthRequest, res, next) => {
  try {
    const { difficulty, tag } = req.query as { difficulty?: string; tag?: string };
    const prompts = await interviewService.getPrompts({ difficulty, tag });
    success(res, prompts);
  } catch (err) {
    next(err);
  }
});

// 2. Get User's Session History
interviewRouter.get('/sessions/history', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Errors.unauthorized();
    
    const history = await interviewService.getUserHistory(userId);
    success(res, history);
  } catch (err) {
    next(err);
  }
});

// 3. Start a new Interview Session
interviewRouter.post('/sessions', validate(StartSessionBody), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) throw Errors.unauthorized();
    
    const { promptId } = req.body;
    const session = await interviewService.startSession(userId, promptId, role);
    success(res, session);
  } catch (err) {
    next(err);
  }
});

// 4. Fetch Details of an active Session
interviewRouter.get('/sessions/:id', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Errors.unauthorized();
    const session = await interviewService.getSession(req.params.id, userId);
    success(res, session);
  } catch (err) {
    next(err);
  }
});

// 5. Use/Unlock a Hint
interviewRouter.post('/sessions/:id/hint', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Errors.unauthorized();
    const session = await interviewService.useHint(req.params.id, userId);
    success(res, session);
  } catch (err) {
    next(err);
  }
});

// 6. Link Design Canvas to Session
interviewRouter.post('/sessions/:id/design', validate(LinkDesignBody), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Errors.unauthorized();
    const { designId } = req.body;
    const session = await interviewService.linkDesign(req.params.id, designId, userId);
    success(res, session);
  } catch (err) {
    next(err);
  }
});

// 7. Submit final Design for Scoring
interviewRouter.post('/sessions/:id/submit', validate(SubmitSessionBody), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Errors.unauthorized();
    const { design } = req.body;
    const result = await interviewService.submitSession(req.params.id, design, userId);
    success(res, result);
  } catch (err) {
    next(err);
  }
});
