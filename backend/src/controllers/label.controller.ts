import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LabelService } from '../services/label.service';

const labelService = new LabelService();

const generateSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  size: z.enum(['A6', 'THERMAL_4X6', 'A4_HALF', 'A4_QUARTER']).default('A6'),
});

export class LabelController {
  async generate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { orderIds, size } = generateSchema.parse(req.body);
      const pdfBuffer = await labelService.generatePDF(orderIds, size);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="labels.pdf"'
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  async getByOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const labels = await labelService.getByOrder(req.params.orderId);
      res.json(labels);
    } catch (err) {
      next(err);
    }
  }
}
