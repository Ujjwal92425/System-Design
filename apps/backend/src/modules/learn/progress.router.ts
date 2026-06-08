import { Router } from 'express';
export const progressRouter = Router();
progressRouter.get('/', (req, res) => res.json({ success: true }));
progressRouter.patch('/', (req, res) => res.json({ success: true }));
