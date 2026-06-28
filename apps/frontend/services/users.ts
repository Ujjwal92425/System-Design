import { api } from '@/lib/api';

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

export const usersService = {
  async updateProfile(data: UpdateProfileData) {
    const res = await api.patch('/users/profile', data);
    return res.data.data;
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    await api.patch('/users/password', { currentPassword, newPassword });
  },

  async getAvatarUploadUrl(filename: string, contentType: string) {
    const res = await api.post('/users/avatar/upload-url', { filename, contentType });
    return res.data.data;
  },

  async updateAvatar(avatarUrl: string) {
    const res = await api.patch('/users/profile', { avatarUrl });
    return res.data.data;
  },

  async deleteAccount() {
    await api.delete('/users/account');
  },
};
