import { PrismaClient, Prisma } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../utils/pagination.utils';
import { createAuditLog } from '../utils/auditLog.utils';
import { stringifyCSV } from '../utils/csv.utils';

const prisma = new PrismaClient();

export interface CustomerListParams {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CustomerCreateData {
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

export class CustomerService {
  async list(params: CustomerListParams) {
    const { page, limit, skip } = getPaginationParams({
      page: params.page,
      limit: params.limit,
    });

    const search = params.search?.trim();
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = (params.sortOrder === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;

    const where: Prisma.CustomerWhereInput = {
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { orgName: { contains: search, mode: 'insensitive' } },
              { customerNumber: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const validSortFields = [
      'customerNumber',
      'orgName',
      'city',
      'country',
      'createdAt',
      'updatedAt',
    ];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        include: {
          _count: { select: { orders: { where: { isDeleted: false } } } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return createPaginatedResult(customers, total, page, limit);
  }

  async create(data: CustomerCreateData, userId?: string) {
    const customer = await prisma.customer.create({ data });

    await createAuditLog(prisma, {
      entityType: 'Customer',
      entityId: customer.id,
      action: 'CREATE',
      userId,
      customerId: customer.id,
      changes: data,
    });

    return customer;
  }

  async getById(id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: { select: { orders: { where: { isDeleted: false } } } },
      },
    });
    if (!customer) {
      throw Object.assign(new Error('Customer not found'), { status: 404 });
    }
    return customer;
  }

  async update(id: string, data: Partial<CustomerCreateData>, userId?: string) {
    const existing = await prisma.customer.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw Object.assign(new Error('Customer not found'), { status: 404 });
    }

    // Calculate changes for audit
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data) as Array<keyof CustomerCreateData>) {
      if (data[key] !== undefined && data[key] !== existing[key]) {
        changes[key] = { from: existing[key], to: data[key] };
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    await createAuditLog(prisma, {
      entityType: 'Customer',
      entityId: id,
      action: 'UPDATE',
      userId,
      customerId: id,
      changes,
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.customer.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw Object.assign(new Error('Customer not found'), { status: 404 });
    }

    await prisma.customer.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await createAuditLog(prisma, {
      entityType: 'Customer',
      entityId: id,
      action: 'DELETE',
      userId,
      customerId: id,
    });
  }

  async exportCSV(): Promise<string> {
    const customers = await prisma.customer.findMany({
      where: { isDeleted: false },
      orderBy: { customerNumber: 'asc' },
    });

    const headers = [
      'customerNumber',
      'orgName',
      'contactPerson',
      'address',
      'city',
      'postalCode',
      'country',
      'phone',
      'email',
    ];

    const rows = customers.map((c) => ({
      customerNumber: c.customerNumber,
      orgName: c.orgName,
      contactPerson: c.contactPerson ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      postalCode: c.postalCode ?? '',
      country: c.country ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    }));

    return stringifyCSV(rows, headers);
  }
}
