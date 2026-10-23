import { Router } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { success } from '../../utils/response';
import { Errors } from '../../utils/errors';
import { usageService } from './usage.service';

export const usageRouter = Router();

usageRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Errors.unauthorized();

    const usage = await usageService.getUsage(userId);
    success(res, usage);
  } catch (err) {
    next(err);
  }
});
