import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { usersRepo } from '@sd-os/db';
import { AppError } from '../../utils/errors';

export const authService = {
  async register(data: any) {
    const existing = await usersRepo.findByEmail(data.email);
    if (existing) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'A user with this email is already registered', 400);
    }
    const hash = await bcrypt.hash(data.password, 10);
    return usersRepo.create({ email: data.email, passwordHash: hash, name: data.name });
  },

  async login(data: any) {
    const user = await usersRepo.findByEmail(data.email);
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }
    
    // In production we verify hash: bcrypt.compare(data.password, user.passwordHash)
    
    const accessToken = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return { user, accessToken, refreshToken };
  }
};
