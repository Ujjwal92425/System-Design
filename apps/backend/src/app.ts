// apps/backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';
import { rateLimit } from './middleware/rateLimit';
import { logger } from './utils/logger';

// Load Jobs
import './jobs/ai-analysis.job';
import './jobs/pdf-export.job';
import './jobs/email.job';

// Import Routers
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { learnRouter } from './modules/learn/tracks.router';
import { designsRouter } from './modules/designs/designs.router';
import { interviewRouter } from './modules/interview/interview.router';
import { communityRouter } from './modules/community/blueprints.router';
import { aiRouter } from './modules/ai/ai.router';
import { billingRouter } from './modules/billing/billing.router';
import { adminRouter } from './modules/admin/admin.router';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ requests: 100, window: '1m' })); // Global rate limit

// Health check endpoint ( Render cold-start mitigation )
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Mounting routes
app.use('/api/auth', authRouter);

// Authenticated Routes
app.use('/api', authenticate);
app.use('/api/users', usersRouter);
app.use('/api/learn', learnRouter);
app.use('/api/designs', designsRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/community', communityRouter);
app.use('/api/ai', aiRouter);
app.use('/api/billing', billingRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

const port = env.PORT;
app.listen(port, () => {
  logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});

export default app;
