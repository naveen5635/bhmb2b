import { Role, OrderStatus, ArticleStatus, LabelSize } from '@prisma/client';

export { Role, OrderStatus, ArticleStatus, LabelSize };

export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

// Extend Express Request globally
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
