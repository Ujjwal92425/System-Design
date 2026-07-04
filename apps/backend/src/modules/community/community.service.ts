import sanitizeHtml from 'sanitize-html';
import { blueprintsRepo, commentsRepo, votesRepo, collectionsRepo, reportsRepo, designsRepo } from '@sd-os/db';
import { AppError } from '../../utils/errors';
import { analyticsService } from '../analytics/analytics.service';
import { storage } from '../../utils/storage';

function sanitize(text: string): string {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export const communityService = {
  async listBlueprints(opts: { page: number; limit: number; sort?: string; topic?: string; difficulty?: string; search?: string }) {
    return blueprintsRepo.listPublished(opts);
  },

  async getBlueprint(id: string) {
    const bp = await blueprintsRepo.findById(id);
    if (!bp) throw new AppError('NOT_FOUND', 'Blueprint not found', 404);
    if (!bp.isPublished) throw new AppError('FORBIDDEN', 'Blueprint not published', 403);
    await blueprintsRepo.incrementView(id);
    return bp;
  },

  async createBlueprint(userId: string, data: { designId: string; title: string; description: string; tags: string[]; mediaUrls?: string[] }) {
    const bp = await blueprintsRepo.create({
      designId: data.designId,
      authorId: userId,
      title: sanitize(data.title),
      description: sanitize(data.description),
      tags: data.tags,
      mediaUrls: data.mediaUrls,
    });
    analyticsService.track(userId, 'blueprint:created', { blueprintId: bp.id, title: data.title });
    return bp;
  },

  async updateBlueprint(id: string, userId: string, data: { title?: string; description?: string; tags?: string[] }) {
    const cleaned: any = {};
    if (data.title !== undefined) cleaned.title = sanitize(data.title);
    if (data.description !== undefined) cleaned.description = sanitize(data.description);
    if (data.tags !== undefined) cleaned.tags = data.tags;
    const bp = await blueprintsRepo.update(id, userId, cleaned);
    analyticsService.track(userId, 'blueprint:updated', { blueprintId: id });
    return bp;
  },

  async deleteBlueprint(id: string, userId: string) {
    await blueprintsRepo.softDelete(id, userId);
    analyticsService.track(userId, 'blueprint:deleted', { blueprintId: id });
    return { deleted: true };
  },

  async forkBlueprint(id: string, userId: string) {
    const bp = await blueprintsRepo.findById(id);
    if (!bp) throw new AppError('NOT_FOUND', 'Blueprint not found', 404);
    const design = bp.design;
    const latestVersion = design.versions[0];
    if (!latestVersion) throw new AppError('BAD_REQUEST', 'Blueprint design has no content', 400);

    const newDesign = await designsRepo.create(
      userId,
      `Fork: ${bp.title}`,
    );

    await designsRepo.save(newDesign.id, userId, {
      nodes: (latestVersion.nodes as any[]) || [],
      edges: (latestVersion.edges as any[]) || [],
      message: `Forked from blueprint: ${bp.title}`,
    });

    await blueprintsRepo.incrementForkCount(id);
    analyticsService.track(userId, 'blueprint:forked', { blueprintId: id, newDesignId: newDesign.id });
    return newDesign;
  },

  async listComments(blueprintId: string) {
    return commentsRepo.findByBlueprint(blueprintId);
  },

  async createComment(blueprintId: string, userId: string, data: { content: string; parentId?: string }) {
    const comment = await commentsRepo.create({
      blueprintId,
      userId,
      content: sanitize(data.content),
      parentId: data.parentId,
    });
    analyticsService.track(userId, 'comment:created', { blueprintId, commentId: comment.id });
    return comment;
  },

  async deleteComment(commentId: string, userId: string) {
    await commentsRepo.softDelete(commentId, userId);
    analyticsService.track(userId, 'comment:deleted', { commentId });
    return { deleted: true };
  },

  async updateComment(commentId: string, userId: string, content: string) {
    return commentsRepo.update(commentId, userId, sanitize(content));
  },

  async vote(blueprintId: string, userId: string, value: number) {
    if (value !== 1 && value !== -1) throw new AppError('BAD_REQUEST', 'Vote must be 1 or -1', 400);
    const result = await votesRepo.upsert(blueprintId, userId, value);
    const netVotes = await votesRepo.getNetVotes(blueprintId);
    await blueprintsRepo.updateVoteCount(blueprintId);
    analyticsService.track(userId, 'blueprint:voted', { blueprintId, value, action: result.action });
    return { netVotes, action: result.action };
  },

  async getUserVote(blueprintId: string, userId: string) {
    return votesRepo.getUserVote(blueprintId, userId);
  },

  async reportBlueprint(blueprintId: string, userId: string, reason: string) {
    const report = await reportsRepo.create({ blueprintId, reporterId: userId, reason });
    analyticsService.track(userId, 'blueprint:reported', { blueprintId, reportId: report.id });

    // Auto-moderation: hide blueprint if it has 5+ pending reports
    const pendingCount = await reportsRepo.countPendingForBlueprint(blueprintId);
    if (pendingCount >= 5) {
      await blueprintsRepo.unpublish(blueprintId);
      analyticsService.track('system', 'blueprint:auto-hidden', { blueprintId, reportCount: pendingCount });
    }

    return report;
  },

  async getUploadUrl(userId: string, contentType: string, fileSize: number) {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileSize > MAX_SIZE) throw new AppError('BAD_REQUEST', 'File size exceeds 5MB limit', 400);
    const ext = contentType.split('/')[1] || 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    return storage.getPresignedUploadUrl(userId, filename, contentType);
  },

  // Collections
  async listCollections(userId: string) {
    return collectionsRepo.listByUser(userId);
  },

  async getCollection(id: string, userId: string) {
    const col = await collectionsRepo.findById(id, userId);
    if (!col) {
      const publicCol = await collectionsRepo.findPublic(id);
      if (!publicCol) throw new AppError('NOT_FOUND', 'Collection not found', 404);
      return publicCol;
    }
    return col;
  },

  async createCollection(userId: string, data: { name: string; description?: string; isPublic?: boolean }) {
    return collectionsRepo.create({ userId, ...data });
  },

  async updateCollection(id: string, userId: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    return collectionsRepo.update(id, userId, data);
  },

  async deleteCollection(id: string, userId: string) {
    await collectionsRepo.delete(id, userId);
    return { deleted: true };
  },

  async addToCollection(collectionId: string, userId: string, blueprintId: string) {
    const col = await collectionsRepo.findById(collectionId, userId);
    if (!col) throw new AppError('NOT_FOUND', 'Collection not found', 404);
    return collectionsRepo.addItem(collectionId, blueprintId);
  },

  async removeFromCollection(collectionId: string, userId: string, blueprintId: string) {
    const col = await collectionsRepo.findById(collectionId, userId);
    if (!col) throw new AppError('NOT_FOUND', 'Collection not found', 404);
    return collectionsRepo.removeItem(collectionId, blueprintId);
  },

  // My blueprints
  async listMyBlueprints(userId: string) {
    return blueprintsRepo.listByAuthor(userId);
  },
};
