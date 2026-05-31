import { Router } from 'express';
import { LabelController } from '../controllers/label.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new LabelController();

// All label routes require authentication
router.use(authMiddleware);

router.post('/generate', controller.generate.bind(controller));
router.get('/order/:orderId', controller.getByOrder.bind(controller));

export default router;
