import { api } from '@/lib/api';

export const authService = {
  async login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    return res.data.data;
  },

  async signup(data: { email: string; password: string; name: string }) {
    const res = await api.post('/auth/signup', data);
    return res.data.data;
  },

  async logout() {
    await api.post('/auth/logout');
  },

  async refresh() {
    const res = await api.post('/auth/refresh');
    return res.data.data;
  },

  async verifyEmail(token: string) {
    const res = await api.post('/auth/verify-email', { token });
    return res.data.data;
  },

  async forgotPassword(email: string) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data.data;
  },

  async resetPassword(token: string, password: string) {
    const res = await api.post('/auth/reset-password', { token, password });
    return res.data.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data.data;
  },
};
