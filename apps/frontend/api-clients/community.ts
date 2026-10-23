import { api } from '@/lib/api';

export interface BlueprintQuery {
  page?: number;
  limit?: number;
  sort?: string;
  topic?: string;
  difficulty?: string;
  search?: string;
}

export interface CreateBlueprintData {
  designId: string;
  title: string;
  description: string;
  tags: string[];
  mediaUrls?: string[];
}

export interface UpdateBlueprintData {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface CreateCommentData {
  content: string;
  parentId?: string;
}

export interface CreateCollectionData {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateCollectionData {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export const communityService = {
  // ── Media Upload ──────────────────────────────────────────────────────────
  async getUploadUrl(contentType: string, fileSize: number) {
    const res = await api.post('/community/upload-url', { contentType, fileSize });
    return res.data.data;
  },

  // ── Blueprints ──────────────────────────────────────────────────────────
  async listBlueprints(query: BlueprintQuery = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.sort) params.set('sort', query.sort);
    if (query.topic) params.set('topic', query.topic);
    if (query.difficulty) params.set('difficulty', query.difficulty);
    if (query.search) params.set('search', query.search);
    const res = await api.get(`/community/blueprints?${params}`);
    return res.data.data;
  },

  async getBlueprint(id: string) {
    const res = await api.get(`/community/blueprints/${id}`);
    return res.data.data;
  },

  async createBlueprint(data: CreateBlueprintData) {
    const res = await api.post('/community/blueprints', data);
    return res.data.data;
  },

  async updateBlueprint(id: string, data: UpdateBlueprintData) {
    const res = await api.patch(`/community/blueprints/${id}`, data);
    return res.data.data;
  },

  async deleteBlueprint(id: string) {
    const res = await api.delete(`/community/blueprints/${id}`);
    return res.data.data;
  },

  async forkBlueprint(id: string) {
    const res = await api.post(`/community/blueprints/${id}/fork`);
    return res.data.data;
  },

  async listMyBlueprints() {
    const res = await api.get('/community/blueprints/mine');
    return res.data.data;
  },

  // ── Comments ────────────────────────────────────────────────────────────
  async listComments(blueprintId: string) {
    const res = await api.get(`/community/blueprints/${blueprintId}/comments`);
    return res.data.data;
  },

  async createComment(blueprintId: string, data: CreateCommentData) {
    const res = await api.post(`/community/blueprints/${blueprintId}/comments`, data);
    return res.data.data;
  },

  async updateComment(commentId: string, content: string) {
    const res = await api.patch(`/community/comments/${commentId}`, { content });
    return res.data.data;
  },

  async deleteComment(commentId: string) {
    const res = await api.delete(`/community/comments/${commentId}`);
    return res.data.data;
  },

  // ── Votes ───────────────────────────────────────────────────────────────
  async vote(blueprintId: string, value: number) {
    const res = await api.post(`/community/blueprints/${blueprintId}/vote`, { value });
    return res.data.data;
  },

  async getUserVote(blueprintId: string) {
    const res = await api.get(`/community/blueprints/${blueprintId}/vote`);
    return res.data.data;
  },

  // ── Reports ─────────────────────────────────────────────────────────────
  async reportBlueprint(blueprintId: string, reason: string) {
    const res = await api.post(`/community/blueprints/${blueprintId}/report`, { reason });
    return res.data.data;
  },

  // ── Collections ─────────────────────────────────────────────────────────
  async listCollections() {
    const res = await api.get('/community/collections');
    return res.data.data;
  },

  async getCollection(id: string) {
    const res = await api.get(`/community/collections/${id}`);
    return res.data.data;
  },

  async createCollection(data: CreateCollectionData) {
    const res = await api.post('/community/collections', data);
    return res.data.data;
  },

  async updateCollection(id: string, data: UpdateCollectionData) {
    const res = await api.patch(`/community/collections/${id}`, data);
    return res.data.data;
  },

  async deleteCollection(id: string) {
    const res = await api.delete(`/community/collections/${id}`);
    return res.data.data;
  },

  async addToCollection(collectionId: string, blueprintId: string) {
    const res = await api.post(`/community/collections/${collectionId}/items`, { blueprintId });
    return res.data.data;
  },

  async removeFromCollection(collectionId: string, blueprintId: string) {
    const res = await api.delete(`/community/collections/${collectionId}/items/${blueprintId}`);
    return res.data.data;
  },
};
