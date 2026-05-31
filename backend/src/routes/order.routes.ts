import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new OrderController();

// All order routes require authentication
router.use(authMiddleware);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));
router.post('/:id/duplicate', controller.duplicate.bind(controller));
router.get('/:id/timeline', controller.getTimeline.bind(controller));
router.patch('/:id/status', controller.updateStatus.bind(controller));

export default router;
