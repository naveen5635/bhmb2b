import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderService } from '../services/order.service';
import { OrderStatus } from '@prisma/client';

const orderService = new OrderService();

const orderItemSchema = z.object({
  articleId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

const updateOrderSchema = z.object({
  customerId: z.string().optional(),
  pickupDate: z.string().optional().nullable(),
  pickupTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).optional(),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'PICKED_UP',
      'CANCELLED',
    ])
    .optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'CANCELLED',
  ]),
});

export class OrderController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page,
        limit,
        search,
        status,
        customerId,
        pickupDate,
        orderDate,
        sortBy,
        sortOrder,
      } = req.query as Record<string, string | undefined>;

      const result = await orderService.list({
        page,
        limit,
        search,
        status,
        customerId,
        pickupDate,
        orderDate,
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
      const data = createOrderSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      const order = await orderService.create(data, userId);
      res.status(201).json(order);
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
      const order = await orderService.getById(req.params.id);
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateOrderSchema.parse(req.body);
      const userId = (req as any).user?.userId;

      const updatePayload: Parameters<OrderService['update']>[1] = {};
      if (data.customerId !== undefined) updatePayload.customerId = data.customerId;
      if (data.pickupDate !== undefined)
        updatePayload.pickupDate = data.pickupDate ?? undefined;
      if (data.pickupTime !== undefined)
        updatePayload.pickupTime = data.pickupTime ?? undefined;
      if (data.notes !== undefined)
        updatePayload.notes = data.notes ?? undefined;
      if (data.status !== undefined)
        updatePayload.status = data.status as OrderStatus;
      if (data.items !== undefined) updatePayload.items = data.items;

      const order = await orderService.update(req.params.id, updatePayload, userId);
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      await orderService.delete(req.params.id, userId);
      res.json({ message: 'Order deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async duplicate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const order = await orderService.duplicate(req.params.id, userId);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  }

  async getTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const timeline = await orderService.getTimeline(req.params.id);
      res.json(timeline);
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status } = updateStatusSchema.parse(req.body);
      const userId = (req as any).user?.userId;
      const order = await orderService.updateStatus(
        req.params.id,
        status as OrderStatus,
        userId
      );
      res.json(order);
    } catch (err) {
      next(err);
    }
  }
}
