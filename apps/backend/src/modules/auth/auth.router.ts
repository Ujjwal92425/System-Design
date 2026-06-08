import { Router } from 'express';
import { authService } from './auth.service';
import { success } from '../../utils/response';
import { validate } from '../../middleware/validate';
import { SignupBody, LoginBody } from './auth.schema';

export const authRouter = Router();

authRouter.post('/signup', validate(SignupBody), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    success(res, user, 201);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', validate(LoginBody), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    // Set refreshToken cookie in production: res.cookie('refreshToken', result.refreshToken, { httpOnly: true });
    success(res, { user: result.user, token: result.accessToken });
  } catch (err) {
    next(err);
  }
});
