import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login',           controller.login.bind(controller));
router.get('/me',               authMiddleware, controller.me.bind(controller));
router.post('/logout',          authMiddleware, controller.logout.bind(controller));
router.put('/profile',          authMiddleware, controller.updateProfile.bind(controller));
router.post('/change-password', authMiddleware, controller.changePassword.bind(controller));

export default router;
