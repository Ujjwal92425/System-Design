import { api } from '@/lib/api';

export const adminService = {
  async getOverview() {
    const res = await api.get('/admin/overview');
    return res.data.data;
  },

  async getAnalyticsOverview() {
    const res = await api.get('/admin/analytics/overview');
    return res.data.data;
  },

  async getRecentEvents(limit = 20) {
    const res = await api.get(`/admin/analytics/events?limit=${limit}`);
    return res.data.data;
  },

  // ── User management ────────────────────────────────────────────────────
  async listUsers(opts: { page?: number; limit?: number; search?: string; role?: string; status?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.search) params.set('search', opts.search);
    if (opts.role) params.set('role', opts.role);
    if (opts.status) params.set('status', opts.status);
    const res = await api.get(`/admin/users?${params}`);
    return res.data.data;
  },

  async getUserById(id: string) {
    const res = await api.get(`/admin/users/${id}`);
    return res.data.data;
  },

  async createUser(data: { email: string; name?: string; password?: string; role?: string }) {
    const res = await api.post('/admin/users', data);
    return res.data.data;
  },

  async updateUser(id: string, data: { name?: string; role?: string; emailVerified?: boolean }) {
    const res = await api.patch(`/admin/users/${id}`, data);
    return res.data.data;
  },

  async suspendUser(id: string, durationMin = 1440) {
    const res = await api.post(`/admin/users/${id}/suspend`, { durationMin });
    return res.data.data;
  },

  async unsuspendUser(id: string) {
    const res = await api.post(`/admin/users/${id}/unsuspend`);
    return res.data.data;
  },

  async deleteUser(id: string) {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data.data;
  },

  async exportUsersCSV() {
    const res = await api.get('/admin/users/export', { responseType: 'text' });
    return res.data;
  },

  async importUsers(users: Array<{ email: string; name?: string; role?: string }>) {
    const res = await api.post('/admin/users/import', { users });
    return res.data.data;
  },

  // ── Content management ──────────────────────────────────────────────────
  async listTracks() {
    const res = await api.get('/admin/tracks');
    return res.data.data;
  },

  async getTrack(id: string) {
    const res = await api.get(`/admin/tracks/${id}`);
    return res.data.data;
  },

  async createTrack(data: any) {
    const res = await api.post('/admin/tracks', data);
    return res.data.data;
  },

  async updateTrack(id: string, data: any) {
    const res = await api.patch(`/admin/tracks/${id}`, data);
    return res.data.data;
  },

  async deleteTrack(id: string) {
    const res = await api.delete(`/admin/tracks/${id}`);
    return res.data.data;
  },

  async listLessons(opts: { page?: number; limit?: number; search?: string; difficulty?: string; published?: string } = {}) {
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.search) params.set('search', opts.search);
    if (opts.difficulty) params.set('difficulty', opts.difficulty);
    if (opts.published) params.set('published', opts.published);
    const res = await api.get(`/admin/lessons?${params}`);
    return res.data.data;
  },

  async getLesson(id: string) {
    const res = await api.get(`/admin/lessons/${id}`);
    return res.data.data;
  },

  async createLesson(data: any) {
    const res = await api.post('/admin/lessons', data);
    return res.data.data;
  },

  async updateLesson(id: string, data: any) {
    const res = await api.patch(`/admin/lessons/${id}`, data);
    return res.data.data;
  },

  async deleteLesson(id: string) {
    const res = await api.delete(`/admin/lessons/${id}`);
    return res.data.data;
  },

  // ── Blueprint moderation ───────────────────────────────────────────────
  async listBlueprints() {
    const res = await api.get('/admin/blueprints');
    return res.data.data;
  },

  async createBlueprint(data: {
    designId: string; title: string; description: string; tags?: string[];
    mediaUrls?: string[]; authorId?: string;
  }) {
    const res = await api.post('/admin/blueprints', data);
    return res.data.data;
  },

  async featureBlueprint(id: string, featured: boolean) {
    const res = await api.patch(`/admin/blueprints/${id}/feature`, { featured });
    return res.data.data;
  },

  async removeBlueprint(id: string) {
    const res = await api.delete(`/admin/blueprints/${id}`);
    return res.data.data;
  },

  async hardDeleteBlueprint(id: string) {
    const res = await api.delete(`/admin/blueprints/${id}/hard`);
    return res.data.data;
  },

  async listPendingReports() {
    const res = await api.get('/admin/reports');
    return res.data.data;
  },

  async reviewReport(id: string, status: string) {
    const res = await api.patch(`/admin/reports/${id}/review`, { status });
    return res.data.data;
  },

  // ── Comment moderation ─────────────────────────────────────────────────
  async listCommentsForBlueprint(blueprintId: string) {
    const res = await api.get(`/admin/blueprints/${blueprintId}/comments`);
    return res.data.data;
  },

  async deleteComment(id: string) {
    const res = await api.delete(`/admin/comments/${id}`);
    return res.data.data;
  },
};
