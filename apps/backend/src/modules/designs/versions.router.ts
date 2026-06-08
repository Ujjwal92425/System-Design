import { Router } from 'express';
export const versionsRouter = Router();
versionsRouter.get('/', (req, res) => res.json({ success: true, data: [] }));
versionsRouter.post('/restore', (req, res) => res.json({ success: true }));
