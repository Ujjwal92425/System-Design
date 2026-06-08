import { z } from 'zod';
export const ProfileUpdateSchema = z.object({
  name: z.string().optional(),
  avatarUrl: z.string().optional()
});
