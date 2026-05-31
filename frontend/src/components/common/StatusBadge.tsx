import { cn } from '@/lib/utils';
import { ORDER_STATUS_CONFIG, ARTICLE_STATUS_CONFIG } from '@/lib/utils';
import type { OrderStatus, ArticleStatus } from '@/types';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.bg, config.color)}>
      {config.label}
    </span>
  );
}

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  const config = ARTICLE_STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.bg, config.color)}>
      {config.label}
    </span>
  );
}
