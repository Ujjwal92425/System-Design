import { db } from '../client';
import { User, Role } from '@sd-os/shared';

export const usersRepo = {
  async findById(id: string) {
    return db.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string) {
    return db.user.findUnique({ where: { email } });
  },

  async create(data: { email: string; name?: string; passwordHash: string }) {
    return db.user.create({
      data: {
        email: data.email,
        name: data.name,
        // Password hash would be saved in a credentials model or auth structure.
        // For simple demo, we issue a user and attach subscription
        subscription: {
          create: {
            plan: 'FREE',
            aiCreditsLimit: 10
          }
        }
      }
    });
  },

  async updateRole(id: string, role: Role) {
    return db.user.update({
      where: { id },
      data: { role: role as any }
    });
  }
};
