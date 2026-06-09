import { Router } from 'express';
import { authService } from './auth.service';
import { success } from '../../utils/response';
import { validate } from '../../middleware/validate';
import { authenticate, AuthRequest } from '../../middleware/authenticate';
import { rateLimit } from '../../middleware/rateLimit';
import { usersRepo } from '@sd-os/db';
import { AppError } from '../../utils/errors';
import { SignupBody, LoginBody, ForgotPasswordBody, ResetPasswordBody, VerifyEmailBody } from './auth.schema';

export const authRouter = Router();

// Strict rate limiting on auth endpoints (AUTH-09 / SEC-07)
const authLimiter = rateLimit({ requests: 5, window: '15m' });

authRouter.post('/signup', authLimiter, validate(SignupBody), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    success(res, { user: result.user }, 201);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', authLimiter, validate(LoginBody), async (req, res, next) => {
  try {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await authService.login(req.body, userAgent, ipAddress);

    // Set refresh token in HttpOnly cookie (SEC-02/03)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    success(res, { user: result.user, token: result.accessToken });
  } catch (err) {
    next(err);
  }
});

// Zero-dependency cookie parsing helper
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    const val = parts.slice(1).join('=')?.trim();
    if (name) {
      cookies[name] = decodeURIComponent(val || '');
    }
  });
  return cookies;
}

authRouter.post('/logout', async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.refreshToken || req.body.refreshToken;
    if (token) {
      await authService.logout(token);
    }
    
    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    success(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'No refresh token provided', 401);
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await authService.refresh(token, userAgent, ipAddress);

    // Set rotated refresh token in HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    success(res, { token: result.accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/verify-email', validate(VerifyEmailBody), async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body.token);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/forgot-password', authLimiter, validate(ForgotPasswordBody), async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/reset-password', authLimiter, validate(ResetPasswordBody), async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// Protected identity endpoint (AUTH-07)
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user?.id) {
      throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
    }
    const user = await usersRepo.findById(req.user.id);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User does not exist', 404);
    }
    success(res, { user });
  } catch (err) {
    next(err);
  }
});
