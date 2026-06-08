import { Router } from 'express';
export const quizzesRouter = Router();
quizzesRouter.post('/:id/attempt', (req, res) => res.json({ success: true }));
