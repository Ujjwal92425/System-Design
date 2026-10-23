import { api } from '@/lib/api';

export interface SubmitDesignData {
  nodes: any[];
  edges: any[];
  localScore?: any;
}

export const interviewService = {
  async listPrompts() {
    const res = await api.get('/interview/prompts');
    return res.data.data;
  },

  async createSession(promptId: string) {
    const res = await api.post('/interview/sessions', { promptId });
    return res.data.data;
  },

  async getSession(id: string) {
    const res = await api.get(`/interview/sessions/${id}`);
    return res.data.data;
  },

  async getHistory() {
    const res = await api.get('/interview/sessions/history');
    return res.data.data;
  },

  async requestHint(sessionId: string) {
    const res = await api.post(`/interview/sessions/${sessionId}/hint`);
    return res.data.data;
  },

  async linkDesign(sessionId: string, designId: string) {
    const res = await api.post(`/interview/sessions/${sessionId}/design`, { designId });
    return res.data.data;
  },

  async submit(sessionId: string, data: SubmitDesignData) {
    const res = await api.post(`/interview/sessions/${sessionId}/submit`, data);
    return res.data.data;
  },
};
