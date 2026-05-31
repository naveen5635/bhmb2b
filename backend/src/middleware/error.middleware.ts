import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.utils';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
    return;
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'Record already exists' });
    return;
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}
