import { Router } from 'express';
export const simulationRouter = Router();
simulationRouter.post('/save-config', (req, res) => res.json({ success: true }));
