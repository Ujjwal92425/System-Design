import { api } from '@/lib/api';

export interface UpdateProgressData {
  lessonId: string;
  status: string;
  resumeState?: any;
  notes?: string;
}

export const learnService = {
  async listTracks() {
    const res = await api.get('/learn/tracks');
    return res.data.data;
  },

  async getTrack(slug: string) {
    const res = await api.get(`/learn/tracks/${slug}`);
    return res.data.data;
  },

  async getLesson(slug: string) {
    const res = await api.get(`/learn/lessons/${slug}`);
    return res.data.data;
  },

  async updateProgress(data: UpdateProgressData) {
    const res = await api.post('/learn/progress/state', data);
    return res.data.data;
  },

  async toggleBookmark(lessonId: string, bookmarked: boolean) {
    const res = await api.post('/learn/progress/bookmark', { lessonId, bookmarked });
    return res.data.data;
  },

  async submitQuiz(quizId: string, answers: any[]) {
    const res = await api.post(`/learn/quizzes/${quizId}/attempt`, { answers });
    return res.data.data;
  },
};
