import { PrismaClient } from '@prisma/client';
import { subDays, addDays, startOfDay, endOfDay, format } from 'date-fns';

const prisma = new PrismaClient();

export interface ChartParams {
  startDate?: string;
  endDate?: string;
}

export class DashboardService {
  async getStats() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const next7Days = addDays(now, 7);

    const [
      totalOrders,
      ordersToday,
      upcomingPickups,
      pendingOrders,
      totalCustomers,
      totalArticles,
    ] = await Promise.all([
      prisma.order.count({ where: { isDeleted: false } }),
      prisma.order.count({
        where: {
          isDeleted: false,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.order.count({
        where: {
          isDeleted: false,
          pickupDate: { gte: now, lte: next7Days },
          status: { notIn: ['PICKED_UP', 'CANCELLED'] },
        },
      }),
      prisma.order.count({
        where: { isDeleted: false, status: 'PENDING' },
      }),
      prisma.customer.count({ where: { isDeleted: false } }),
      prisma.article.count({
        where: { isDeleted: false, status: 'ACTIVE' },
      }),
    ]);

    return {
      totalOrders,
      ordersToday,
      upcomingPickups,
      pendingOrders,
      totalCustomers,
      totalArticles,
    };
  }

  async getCharts(params: ChartParams) {
    const now = new Date();
    const chartStart = params.startDate
      ? new Date(params.startDate)
      : subDays(now, 30);
    const chartEnd = params.endDate ? new Date(params.endDate) : now;

    // 1. Orders per day (last 30 days or date range)
    const ordersInRange = await prisma.order.findMany({
      where: {
        isDeleted: false,
        orderDate: { gte: startOfDay(chartStart), lte: endOfDay(chartEnd) },
      },
      select: { orderDate: true },
      orderBy: { orderDate: 'asc' },
    });

    // Group orders by day
    const orderDayMap: Record<string, number> = {};
    for (const order of ordersInRange) {
      const dayKey = format(new Date(order.orderDate), 'yyyy-MM-dd');
      orderDayMap[dayKey] = (orderDayMap[dayKey] || 0) + 1;
    }
    const ordersPerDay = Object.entries(orderDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. Orders by customer (top 10)
    const customerOrderCounts = await prisma.order.groupBy({
      by: ['customerId'],
      where: { isDeleted: false },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const customerIds = customerOrderCounts.map((c) => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, customerNumber: true, orgName: true },
    });

    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));
    const ordersByCustomer = customerOrderCounts.map((row) => ({
      customerId: row.customerId,
      customerNumber: customerMap[row.customerId]?.customerNumber ?? '',
      orgName: customerMap[row.customerId]?.orgName ?? 'Unknown',
      orderCount: row._count.id,
    }));

    // 3. Most ordered articles (top 10 by total quantity)
    const articleQuantities = await prisma.orderItem.groupBy({
      by: ['articleId'],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const articleIds = articleQuantities.map((a) => a.articleId);
    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds } },
      select: { id: true, articleNumber: true, name: true },
    });

    const articleMap = Object.fromEntries(articles.map((a) => [a.id, a]));
    const mostOrderedArticles = articleQuantities.map((row) => ({
      articleId: row.articleId,
      articleNumber: articleMap[row.articleId]?.articleNumber ?? '',
      name: articleMap[row.articleId]?.name ?? 'Unknown',
      totalQuantity: row._sum.quantity ?? 0,
      orderCount: row._count.id,
    }));

    // 4. Pickup trends (next 30 days)
    const next30Days = addDays(now, 30);
    const upcomingOrders = await prisma.order.findMany({
      where: {
        isDeleted: false,
        pickupDate: {
          gte: startOfDay(now),
          lte: endOfDay(next30Days),
        },
        status: { notIn: ['CANCELLED', 'PICKED_UP'] },
      },
      select: { pickupDate: true },
    });

    const pickupDayMap: Record<string, number> = {};
    for (const order of upcomingOrders) {
      if (order.pickupDate) {
        const dayKey = format(new Date(order.pickupDate), 'yyyy-MM-dd');
        pickupDayMap[dayKey] = (pickupDayMap[dayKey] || 0) + 1;
      }
    }
    const pickupTrends = Object.entries(pickupDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      ordersPerDay,
      ordersByCustomer,
      mostOrderedArticles,
      pickupTrends,
    };
  }
}
