import { api } from '@/lib/api';

export const aiService = {
  async analyzeDesign(design: { nodes: any[]; edges: any[] }) {
    const res = await api.post('/ai/analyze-design', { design });
    return res.data.data;
  },
};
