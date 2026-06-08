import { Router } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { success } from '../../utils/response';
import { usersRepo } from '@sd-os/db';

export const usersRouter = Router();

usersRouter.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const user = await usersRepo.findById(req.user!.id);
    success(res, user);
  } catch (err) {
    next(err);
  }
});
