import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ArticleService, ArticleCSVRow } from '../services/article.service';
import { parseCSV } from '../utils/csv.utils';

const articleService = new ArticleService();

const createArticleSchema = z.object({
  articleNumber: z.string().min(1),
  name: z.string().min(1),
  pcsPerCarton: z.number().int().positive(),
  pricePerPcs: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  storageTemperature: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const updateArticleSchema = createArticleSchema.partial();

export class ArticleController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, status, sortBy, sortOrder } =
        req.query as Record<string, string | undefined>;
      const result = await articleService.list({
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createArticleSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      const article = await articleService.create(data, userId);
      res.status(201).json(article);
    } catch (err) {
      next(err);
    }
  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const article = await articleService.getById(req.params.id);
      res.json(article);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateArticleSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      const article = await articleService.update(req.params.id, data, userId);
      res.json(article);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      await articleService.delete(req.params.id, userId);
      res.json({ message: 'Article deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async importCSV(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }

      const headers = [
        'articleNumber',
        'name',
        'pcsPerCarton',
        'pricePerPcs',
        'weight',
        'storageTemperature',
        'notes',
        'status',
      ];

      const rows = await parseCSV<ArticleCSVRow>(req.file.buffer, headers);
      const userId = (req as any).user?.userId;
      const result = await articleService.importFromCSV(rows, userId);

      res.json({
        message: 'CSV import completed',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async exportCSV(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const csv = await articleService.exportCSV();
      const filename = `articles_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
