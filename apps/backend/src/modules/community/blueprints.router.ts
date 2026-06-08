import { Router } from 'express';
export const communityRouter = Router();
communityRouter.get('/', (req, res) => res.json({ success: true, data: [] }));
