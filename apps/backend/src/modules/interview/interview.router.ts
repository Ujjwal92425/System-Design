import { Router } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { success } from '../../utils/response';
import { scoreDesign } from './scoring.service';

export const interviewRouter = Router();

interviewRouter.post('/sessions/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    const { design } = req.body;
    const mockRubric = [
      { id: 'has-load-balancer', name: 'Load Balancer Present', weight: 30, hint: 'Add a load balancer to split incoming traffic.' },
      { id: 'has-cache', name: 'Cache Layer', weight: 40, hint: 'Store temporary data in Cache (Redis) to limit database accesses.' },
      { id: 'has-db-replicas', name: 'DB Read Replicas', weight: 30, hint: 'Configure SQL read replicas to scale read queries.' }
    ];

    const report = scoreDesign(design, mockRubric);
    success(res, report);
  } catch (err) {
    next(err);
  }
});
