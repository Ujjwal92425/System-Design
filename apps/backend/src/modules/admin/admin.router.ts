import { Router } from 'express';
export const adminRouter = Router();
adminRouter.get('/overview', (req, res) => res.json({ success: true, data: {} }));
