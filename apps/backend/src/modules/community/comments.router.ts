import { Router } from 'express';
export const commentsRouter = Router();
commentsRouter.post('/', (req, res) => res.json({ success: true }));
