import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new CustomerController();

// All customer routes require authentication
router.use(authMiddleware);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/export', controller.exportCSV.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
