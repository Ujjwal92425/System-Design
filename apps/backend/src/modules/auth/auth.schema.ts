import { z } from 'zod';

export const SignupBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
});

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string()
});
