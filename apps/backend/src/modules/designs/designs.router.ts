import { Router } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { success } from '../../utils/response';
import { designsRepo } from '@sd-os/db';

export const designsRouter = Router();

designsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const list = await designsRepo.listByUser(req.user!.id);
    success(res, list);
  } catch (err) {
    next(err);
  }
});

designsRouter.post('/:id/save', async (req: AuthRequest, res, next) => {
  try {
    const updated = await designsRepo.save(req.params.id, req.body);
    success(res, updated);
  } catch (err) {
    next(err);
  }
});
