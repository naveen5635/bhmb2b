import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../utils/pagination.utils';
import { createAuditLog } from '../utils/auditLog.utils';
import { generateOrderNumber } from '../utils/orderNumber.utils';

const prisma = new PrismaClient();

export interface OrderListParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  customerId?: string;
  pickupDate?: string;
  orderDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface OrderItemInput {
  articleId: string;
  quantity: number;
}

export interface OrderCreateData {
  customerId: string;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  items: OrderItemInput[];
}

export class OrderService {
  async list(params: OrderListParams) {
    const { page, limit, skip } = getPaginationParams({
      page: params.page,
      limit: params.limit,
    });

    const search = params.search?.trim();
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = (params.sortOrder === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;

    const validStatuses: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'PICKED_UP',
      'CANCELLED',
    ];

    const where: Prisma.OrderWhereInput = {
      isDeleted: false,
      ...(params.status && validStatuses.includes(params.status as OrderStatus)
        ? { status: params.status as OrderStatus }
        : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.pickupDate
        ? {
            pickupDate: {
              gte: new Date(params.pickupDate + 'T00:00:00.000Z'),
              lte: new Date(params.pickupDate + 'T23:59:59.999Z'),
            },
          }
        : {}),
      ...(params.orderDate
        ? {
            orderDate: {
              gte: new Date(params.orderDate + 'T00:00:00.000Z'),
              lte: new Date(params.orderDate + 'T23:59:59.999Z'),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customer: { orgName: { contains: search, mode: 'insensitive' } } },
              { customer: { customerNumber: { contains: search, mode: 'insensitive' } } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const validSortFields = [
      'orderNumber',
      'orderDate',
      'pickupDate',
      'status',
      'createdAt',
      'updatedAt',
    ];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              customerNumber: true,
              orgName: true,
              contactPerson: true,
              city: true,
            },
          },
          items: {
            include: {
              article: {
                select: {
                  id: true,
                  articleNumber: true,
                  name: true,
                  storageTemperature: true,
                },
              },
            },
          },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return createPaginatedResult(orders, total, page, limit);
  }

  async create(data: OrderCreateData, userId?: string) {
    const orderNumber = await generateOrderNumber(prisma);

    // Validate customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, isDeleted: false },
    });
    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { status: 404 });
    }

    // Build order items with carton calculations
    const itemsData: Array<{
      articleId: string;
      quantity: number;
      pcsPerCarton: number;
      totalCartons: number;
    }> = [];

    for (const item of data.items) {
      const article = await prisma.article.findFirst({
        where: { id: item.articleId, isDeleted: false },
      });
      if (!article) {
        throw Object.assign(
          new Error(`Article not found: ${item.articleId}`),
          { status: 404 }
        );
      }
      const totalCartons = Math.ceil(item.quantity / article.pcsPerCarton);
      itemsData.push({
        articleId: item.articleId,
        quantity: item.quantity,
        pcsPerCarton: article.pcsPerCarton,
        totalCartons,
      });
    }

    // Create order and items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          pickupDate: data.pickupDate ? new Date(data.pickupDate) : null,
          pickupTime: data.pickupTime || null,
          notes: data.notes || null,
          status: 'PENDING',
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: true,
          items: { include: { article: true } },
        },
      });
    });

    await createAuditLog(prisma, {
      entityType: 'Order',
      entityId: order.id,
      action: 'CREATE',
      userId,
      orderId: order.id,
      customerId: data.customerId,
      changes: { orderNumber, status: 'PENDING', itemCount: itemsData.length },
    });

    return order;
  }

  async getById(id: string) {
    const order = await prisma.order.findFirst({
      where: { id, isDeleted: false },
      include: {
        customer: true,
        items: {
          include: {
            article: true,
          },
        },
        labels: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }
    return order;
  }

  async update(
    id: string,
    data: Partial<Omit<OrderCreateData, 'items'>> & { items?: OrderItemInput[]; status?: OrderStatus },
    userId?: string
  ) {
    const existing = await prisma.order.findFirst({
      where: { id, isDeleted: false },
      include: { items: true },
    });
    if (!existing) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    const changes: Record<string, unknown> = {};

    const updateData: Prisma.OrderUpdateInput = {};

    if (data.pickupDate !== undefined) {
      updateData.pickupDate = data.pickupDate ? new Date(data.pickupDate) : null;
      changes.pickupDate = { from: existing.pickupDate, to: data.pickupDate };
    }
    if (data.pickupTime !== undefined) {
      updateData.pickupTime = data.pickupTime;
      changes.pickupTime = { from: existing.pickupTime, to: data.pickupTime };
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
      changes.notes = { from: existing.notes, to: data.notes };
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
      changes.status = { from: existing.status, to: data.status };
    }
    if (data.customerId !== undefined) {
      updateData.customer = { connect: { id: data.customerId } };
      changes.customerId = { from: existing.customerId, to: data.customerId };
    }

    let order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: updateData,
      });

      if (data.items && data.items.length > 0) {
        // Replace all items
        await tx.orderItem.deleteMany({ where: { orderId: id } });

        const itemsData = await Promise.all(
          data.items.map(async (item) => {
            const article = await tx.article.findFirst({
              where: { id: item.articleId, isDeleted: false },
            });
            if (!article) {
              throw Object.assign(
                new Error(`Article not found: ${item.articleId}`),
                { status: 404 }
              );
            }
            return {
              orderId: id,
              articleId: item.articleId,
              quantity: item.quantity,
              pcsPerCarton: article.pcsPerCarton,
              totalCartons: Math.ceil(item.quantity / article.pcsPerCarton),
            };
          })
        );

        await tx.orderItem.createMany({ data: itemsData });
        changes.itemsReplaced = true;
      }

      return updated;
    });

    await createAuditLog(prisma, {
      entityType: 'Order',
      entityId: id,
      action: 'UPDATE',
      userId,
      orderId: id,
      changes,
    });

    return this.getById(id);
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.order.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    await prisma.order.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await createAuditLog(prisma, {
      entityType: 'Order',
      entityId: id,
      action: 'DELETE',
      userId,
      orderId: id,
    });
  }

  async duplicate(id: string, userId?: string) {
    const original = await prisma.order.findFirst({
      where: { id, isDeleted: false },
      include: { items: true },
    });
    if (!original) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    const orderNumber = await generateOrderNumber(prisma);

    const duplicated = await prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          orderNumber,
          customerId: original.customerId,
          pickupDate: original.pickupDate,
          pickupTime: original.pickupTime,
          notes: original.notes ? `Copy of ${original.orderNumber}: ${original.notes}` : `Copy of ${original.orderNumber}`,
          status: 'PENDING',
          items: {
            create: original.items.map((item) => ({
              articleId: item.articleId,
              quantity: item.quantity,
              pcsPerCarton: item.pcsPerCarton,
              totalCartons: item.totalCartons,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { article: true } },
        },
      });
    });

    await createAuditLog(prisma, {
      entityType: 'Order',
      entityId: duplicated.id,
      action: 'DUPLICATE',
      userId,
      orderId: duplicated.id,
      changes: { sourceOrderId: id, sourceOrderNumber: original.orderNumber, newOrderNumber: orderNumber },
    });

    return duplicated;
  }

  async getTimeline(id: string) {
    const order = await prisma.order.findFirst({
      where: { id, isDeleted: false },
    });
    if (!order) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    return prisma.auditLog.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, name: true, role: true },
        },
      },
    });
  }

  async updateStatus(id: string, status: OrderStatus, userId?: string) {
    const existing = await prisma.order.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    await createAuditLog(prisma, {
      entityType: 'Order',
      entityId: id,
      action: 'STATUS_CHANGE',
      userId,
      orderId: id,
      changes: { from: existing.status, to: status },
    });

    return updated;
  }
}
