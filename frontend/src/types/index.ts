export type Role = 'ADMIN' | 'STAFF';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'CANCELLED';
export type ArticleStatus = 'ACTIVE' | 'INACTIVE';
export type LabelSize = 'A6' | 'THERMAL_4X6' | 'A4_HALF' | 'A4_QUARTER';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerNumber: string;
  orgName: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number };
}

export interface Article {
  id: string;
  articleNumber: string;
  name: string;
  pcsPerCarton: number;
  pricePerPcs?: number;
  weight?: number;
  storageTemperature?: string;
  notes?: string;
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  articleId: string;
  article: Article;
  quantity: number;
  pcsPerCarton: number;
  totalCartons: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  orderDate: string;
  pickupDate?: string;
  pickupTime?: string;
  status: OrderStatus;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  user?: { name: string; username: string };
  changes?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalOrders: number;
  ordersToday: number;
  upcomingPickups: number;
  pendingOrders: number;
  totalCustomers: number;
  totalArticles: number;
}

export interface DashboardCharts {
  ordersPerDay: { date: string; count: number }[];
  ordersByCustomer: { customerNumber: string; orgName: string; count: number }[];
  mostOrderedArticles: { articleNumber: string; name: string; totalQuantity: number }[];
  pickupTrends: { date: string; count: number }[];
}

export interface CreateOrderInput {
  customerId: string;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  items: { articleId: string; quantity: number }[];
}

export interface CreateCustomerInput {
  customerNumber: string;
  orgName: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  notes?: string;
}

export interface CreateArticleInput {
  articleNumber: string;
  name: string;
  pcsPerCarton: number;
  pricePerPcs?: number;
  weight?: number;
  storageTemperature?: string;
  notes?: string;
  status?: ArticleStatus;
}
