import { Router } from 'express';
export const votesRouter = Router();
votesRouter.post('/', (req, res) => res.json({ success: true }));
