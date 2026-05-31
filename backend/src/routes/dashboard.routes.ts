import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new DashboardController();

// All dashboard routes require authentication
router.use(authMiddleware);

router.get('/stats', controller.getStats.bind(controller));
router.get('/charts', controller.getCharts.bind(controller));

export default router;
