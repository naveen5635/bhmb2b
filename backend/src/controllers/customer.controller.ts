import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CustomerService } from '../services/customer.service';

const customerService = new CustomerService();

const createCustomerSchema = z.object({
  customerNumber: z.string().min(1),
  orgName: z.string().min(1),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  taxNumber: z.string().optional(),
  notes: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

export class CustomerController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, sortBy, sortOrder } = req.query as Record<
        string,
        string | undefined
      >;
      const result = await customerService.list({
        page,
        limit,
        search,
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
      const data = createCustomerSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      const customer = await customerService.create(data, userId);
      res.status(201).json(customer);
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
      const customer = await customerService.getById(req.params.id);
      res.json(customer);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateCustomerSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      const customer = await customerService.update(req.params.id, data, userId);
      res.json(customer);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      await customerService.delete(req.params.id, userId);
      res.json({ message: 'Customer deleted successfully' });
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
      const csv = await customerService.exportCSV();
      const filename = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
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
