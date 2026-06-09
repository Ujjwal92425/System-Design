/**
 * apps/backend/src/modules/users/users.schema.ts
 *
 * Zod validation schemas for user profile endpoints.
 */

import { z } from 'zod';

export const UpdateProfileBody = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be at most 80 characters')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional(),
  avatarUrl: z
    .string()
    .url('Avatar URL must be a valid URL')
    .optional()
    .or(z.literal('')),
});

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters'),
});

// Route param validators
export const UserIdParam = z.object({
  id: z.string().min(1, 'User ID is required'),
});
