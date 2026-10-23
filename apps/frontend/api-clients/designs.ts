import { api } from '@/lib/api';

export interface SaveDesignData {
  nodes: any[];
  edges: any[];
  message?: string;
}

export const designsService = {
  async list() {
    const res = await api.get('/designs');
    return res.data.data;
  },

  async listTemplates() {
    const res = await api.get('/designs/templates');
    return res.data.data;
  },

  async get(id: string) {
    const res = await api.get(`/designs/${id}`);
    return res.data.data;
  },

  async create(data: { title: string; description?: string; templateId?: string }) {
    const res = await api.post('/designs', data);
    return res.data.data;
  },

  async updateMeta(id: string, data: { title?: string; description?: string; isPublic?: boolean }) {
    const res = await api.patch(`/designs/${id}`, data);
    return res.data.data;
  },

  async save(id: string, data: SaveDesignData) {
    const res = await api.post(`/designs/${id}/save`, data);
    return res.data.data;
  },

  async restore(id: string, version: number) {
    const res = await api.post(`/designs/${id}/restore`, { version });
    return res.data.data;
  },

  async delete(id: string) {
    await api.delete(`/designs/${id}`);
  },
};
