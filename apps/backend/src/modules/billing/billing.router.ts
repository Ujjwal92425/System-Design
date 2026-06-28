import { Router } from 'express';
export const billingRouter = Router();
billingRouter.get('/plans', (req, res) => res.json({ success: true, data: {} }));
