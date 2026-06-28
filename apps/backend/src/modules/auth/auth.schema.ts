import { z } from 'zod';

export const SignupBody = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
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
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

export const VerifyEmailBody = z.object({
  token: z.string().min(1, 'Token is required')
});
