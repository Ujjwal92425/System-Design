import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { rateLimit } from '../../middleware/rateLimit';
import { success } from '../../utils/response';
import { AuthRequest } from '../../middleware/authenticate';
import { communityService } from './community.service';
import {
  CreateBlueprintBody, UpdateBlueprintBody,
  CreateCommentBody, UpdateCommentBody,
  VoteBody, CreateCollectionBody, UpdateCollectionBody,
  ReportBlueprintBody, AddToCollectionBody, BlueprintQuerySchema,
  UploadMediaSchema,
} from './community.schema';

export const communityRouter = Router();

const blueprintCreateLimit = rateLimit({ requests: 5, window: '1h', message: 'Max 5 blueprint posts per hour' });
const likeLimit = rateLimit({ requests: 60, window: '1m', message: 'Max 60 likes per minute' });
const commentLimit = rateLimit({ requests: 10, window: '1m', message: 'Max 10 comments per minute' });
const reportLimit = rateLimit({ requests: 3, window: '1h', message: 'Max 3 reports per hour' });

// ── Upload URL ─────────────────────────────────────────────────────────────────
communityRouter.post('/upload-url', validate(UploadMediaSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.getUploadUrl(req.user!.id, req.body.contentType, req.body.fileSize);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── Blueprints ─────────────────────────────────────────────────────────────────
communityRouter.get('/blueprints', async (req: AuthRequest, res, next) => {
  try {
    const query = BlueprintQuerySchema.parse(req.query);
    const result = await communityService.listBlueprints(query);
    success(res, result);
  } catch (err) { next(err); }
});

communityRouter.get('/blueprints/mine', async (req: AuthRequest, res, next) => {
  try {
    const items = await communityService.listMyBlueprints(req.user!.id);
    success(res, items);
  } catch (err) { next(err); }
});

communityRouter.post('/blueprints', blueprintCreateLimit, validate(CreateBlueprintBody), async (req: AuthRequest, res, next) => {
  try {
    const bp = await communityService.createBlueprint(req.user!.id, req.body);
    res.status(201).json({ success: true, data: bp });
  } catch (err) { next(err); }
});

communityRouter.get('/blueprints/:id', async (req: AuthRequest, res, next) => {
  try {
    const bp = await communityService.getBlueprint(req.params.id);
    success(res, bp);
  } catch (err) { next(err); }
});

communityRouter.patch('/blueprints/:id', validate(UpdateBlueprintBody), async (req: AuthRequest, res, next) => {
  try {
    const bp = await communityService.updateBlueprint(req.params.id, req.user!.id, req.body);
    success(res, bp);
  } catch (err) { next(err); }
});

communityRouter.delete('/blueprints/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.deleteBlueprint(req.params.id, req.user!.id);
    success(res, result);
  } catch (err) { next(err); }
});

communityRouter.post('/blueprints/:id/fork', async (req: AuthRequest, res, next) => {
  try {
    const design = await communityService.forkBlueprint(req.params.id, req.user!.id);
    res.status(201).json({ success: true, data: design });
  } catch (err) { next(err); }
});

// ── Comments ───────────────────────────────────────────────────────────────────
communityRouter.get('/blueprints/:id/comments', async (req: AuthRequest, res, next) => {
  try {
    const comments = await communityService.listComments(req.params.id);
    success(res, comments);
  } catch (err) { next(err); }
});

communityRouter.post('/blueprints/:id/comments', commentLimit, validate(CreateCommentBody), async (req: AuthRequest, res, next) => {
  try {
    const comment = await communityService.createComment(req.params.id, req.user!.id, req.body);
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

communityRouter.patch('/comments/:id', validate(UpdateCommentBody), async (req: AuthRequest, res, next) => {
  try {
    const comment = await communityService.updateComment(req.params.id, req.user!.id, req.body.content);
    success(res, comment);
  } catch (err) { next(err); }
});

communityRouter.delete('/comments/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.deleteComment(req.params.id, req.user!.id);
    success(res, result);
  } catch (err) { next(err); }
});

// ── Votes (Like/Unlike) ────────────────────────────────────────────────────────
communityRouter.post('/blueprints/:id/vote', likeLimit, validate(VoteBody), async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.vote(req.params.id, req.user!.id, req.body.value);
    success(res, result);
  } catch (err) { next(err); }
});

communityRouter.get('/blueprints/:id/vote', async (req: AuthRequest, res, next) => {
  try {
    const vote = await communityService.getUserVote(req.params.id, req.user!.id);
    success(res, vote);
  } catch (err) { next(err); }
});

// ── Reports ────────────────────────────────────────────────────────────────────
communityRouter.post('/blueprints/:id/report', reportLimit, validate(ReportBlueprintBody), async (req: AuthRequest, res, next) => {
  try {
    const report = await communityService.reportBlueprint(req.params.id, req.user!.id, req.body.reason);
    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

// ── Collections ────────────────────────────────────────────────────────────────
communityRouter.get('/collections', async (req: AuthRequest, res, next) => {
  try {
    const collections = await communityService.listCollections(req.user!.id);
    success(res, collections);
  } catch (err) { next(err); }
});

communityRouter.post('/collections', validate(CreateCollectionBody), async (req: AuthRequest, res, next) => {
  try {
    const col = await communityService.createCollection(req.user!.id, req.body);
    res.status(201).json({ success: true, data: col });
  } catch (err) { next(err); }
});

communityRouter.get('/collections/:id', async (req: AuthRequest, res, next) => {
  try {
    const col = await communityService.getCollection(req.params.id, req.user!.id);
    success(res, col);
  } catch (err) { next(err); }
});

communityRouter.patch('/collections/:id', validate(UpdateCollectionBody), async (req: AuthRequest, res, next) => {
  try {
    const col = await communityService.updateCollection(req.params.id, req.user!.id, req.body);
    success(res, col);
  } catch (err) { next(err); }
});

communityRouter.delete('/collections/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.deleteCollection(req.params.id, req.user!.id);
    success(res, result);
  } catch (err) { next(err); }
});

communityRouter.post('/collections/:id/items', validate(AddToCollectionBody), async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.addToCollection(req.params.id, req.user!.id, req.body.collectionId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

communityRouter.delete('/collections/:id/items/:blueprintId', async (req: AuthRequest, res, next) => {
  try {
    const result = await communityService.removeFromCollection(req.params.id, req.user!.id, req.params.blueprintId);
    success(res, result);
  } catch (err) { next(err); }
});

// Legacy endpoint
communityRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const query = BlueprintQuerySchema.parse(req.query);
    const result = await communityService.listBlueprints(query);
    success(res, result);
  } catch (err) { next(err); }
});
