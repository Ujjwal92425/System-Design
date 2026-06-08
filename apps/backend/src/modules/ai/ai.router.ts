import { Router } from 'express';
import { success } from '../../utils/response';
import { aiService } from './ai.service';

export const aiRouter = Router();

aiRouter.post('/analyze-design', async (req, res, next) => {
  try {
    const result = await aiService.analyze(req.body.design);
    success(res, result);
  } catch (err) {
    next(err);
  }
});
