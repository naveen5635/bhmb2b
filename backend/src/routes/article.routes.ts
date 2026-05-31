import { Router } from 'express';
import multer from 'multer';
import { ArticleController } from '../controllers/article.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new ArticleController();

// Multer: memory storage, accept only .csv files
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

// All article routes require authentication
router.use(authMiddleware);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/export', controller.exportCSV.bind(controller));
router.post(
  '/import',
  upload.single('file'),
  controller.importCSV.bind(controller)
);
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
