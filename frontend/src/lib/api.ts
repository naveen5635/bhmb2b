import axios from 'axios';
import type {
  User, Customer, Article, Order, AuditLog, PaginatedResponse,
  DashboardStats, DashboardCharts, CreateOrderInput, CreateCustomerInput,
  CreateArticleInput, OrderStatus, LabelSize
} from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { username, password }).then(r => r.data),
  me: () => api.get<User>('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data: { name?: string; email?: string }) =>
    api.put<User>('/auth/profile', data).then(r => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Customers
export const customerApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Customer>>('/customers', { params }).then(r => r.data),
  create: (data: CreateCustomerInput) =>
    api.post<Customer>('/customers', data).then(r => r.data),
  getById: (id: string) =>
    api.get<Customer>(`/customers/${id}`).then(r => r.data),
  update: (id: string, data: Partial<CreateCustomerInput>) =>
    api.put<Customer>(`/customers/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  exportCSV: () => api.get('/customers/export', { responseType: 'blob' }).then(r => r.data as Blob),
};

// Articles
export const articleApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Article>>('/articles', { params }).then(r => r.data),
  create: (data: CreateArticleInput) =>
    api.post<Article>('/articles', data).then(r => r.data),
  getById: (id: string) =>
    api.get<Article>(`/articles/${id}`).then(r => r.data),
  update: (id: string, data: Partial<CreateArticleInput>) =>
    api.put<Article>(`/articles/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/articles/${id}`),
  importCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/articles/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  exportCSV: () => api.get('/articles/export', { responseType: 'blob' }).then(r => r.data as Blob),
};

// Orders
export const orderApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Order>>('/orders', { params }).then(r => r.data),
  create: (data: CreateOrderInput) =>
    api.post<Order>('/orders', data).then(r => r.data),
  getById: (id: string) =>
    api.get<Order>(`/orders/${id}`).then(r => r.data),
  update: (id: string, data: Partial<CreateOrderInput>) =>
    api.put<Order>(`/orders/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/orders/${id}`),
  duplicate: (id: string) =>
    api.post<Order>(`/orders/${id}/duplicate`).then(r => r.data),
  getTimeline: (id: string) =>
    api.get<AuditLog[]>(`/orders/${id}/timeline`).then(r => r.data),
  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<Order>(`/orders/${id}/status`, { status }).then(r => r.data),
};

// Labels
export const labelApi = {
  generate: (orderIds: string[], size: LabelSize) =>
    api.post('/labels/generate', { orderIds, size }, { responseType: 'blob' }).then(r => r.data as Blob),
  getByOrder: (orderId: string) =>
    api.get(`/labels/order/${orderId}`).then(r => r.data),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats').then(r => r.data),
  getCharts: (params?: { startDate?: string; endDate?: string }) =>
    api.get<DashboardCharts>('/dashboard/charts', { params }).then(r => r.data),
};

export default api;
