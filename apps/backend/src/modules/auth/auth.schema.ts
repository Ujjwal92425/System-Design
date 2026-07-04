import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const SignupBody = z.object({
  email: z.string().email('Invalid email address format'),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters long').optional()
});

export const LoginBody = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

export const ForgotPasswordBody = z.object({
  email: z.string().email('Invalid email address format')
});

export const ResetPasswordBody = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema
});

export const VerifyEmailBody = z.object({
  token: z.string().min(1, 'Token is required')
});
