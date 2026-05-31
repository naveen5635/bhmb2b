import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const updateProfileSchema = z.object({
  name:  z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const result = await authService.login(username, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.me((req as any).user.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile((req as any).user.userId, data);
      res.json(user);
    } catch (err) { next(err); }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.json({ message: 'Logged out successfully' });
  }

  async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(
        req.body
      );
      await authService.changePassword(
        (req as any).user.userId,
        currentPassword,
        newPassword
      );
      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  }
}
