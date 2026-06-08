import { Router } from 'express';
import { success } from '../../utils/response';
import { db } from '@sd-os/db';

export const learnRouter = Router();

learnRouter.get('/tracks', async (req, res, next) => {
  try {
    const tracks = await db.track.findMany({ where: { isPublished: true }, orderBy: { order: 'asc' } });
    success(res, tracks);
  } catch (err) {
    next(err);
  }
});
