import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import type { OrderStatus, ArticleStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined | null, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, fmt) : '-';
}

export function formatDateTime(date: string | Date | undefined | null): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-100' },
  PREPARING: { label: 'Preparing', color: 'text-orange-700', bg: 'bg-orange-100' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', color: 'text-purple-700', bg: 'bg-purple-100' },
  PICKED_UP: { label: 'Picked Up', color: 'text-green-700', bg: 'bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};

export const ARTICLE_STATUS_CONFIG: Record<ArticleStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  INACTIVE: { label: 'Inactive', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
