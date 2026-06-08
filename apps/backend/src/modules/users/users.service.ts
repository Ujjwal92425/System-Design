import { usersRepo } from '@sd-os/db';
export const usersService = {
  async getProfile(id: string) {
    return usersRepo.findById(id);
  }
};
