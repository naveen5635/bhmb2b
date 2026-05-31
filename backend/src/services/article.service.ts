import { PrismaClient, Prisma, ArticleStatus } from '@prisma/client';
import { getPaginationParams, createPaginatedResult } from '../utils/pagination.utils';
import { createAuditLog } from '../utils/auditLog.utils';
import { stringifyCSV } from '../utils/csv.utils';

const prisma = new PrismaClient();

export interface ArticleListParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ArticleCreateData {
  articleNumber: string;
  name: string;
  pcsPerCarton: number;
  weight?: number;
  storageTemperature?: string;
  notes?: string;
  status?: ArticleStatus;
}

export interface ArticleCSVRow {
  articleNumber: string;
  name: string;
  pcsPerCarton: string;
  pricePerPcs?: string;
  weight?: string;
  storageTemperature?: string;
  notes?: string;
  status?: string;
}

export class ArticleService {
  async list(params: ArticleListParams) {
    const { page, limit, skip } = getPaginationParams({
      page: params.page,
      limit: params.limit,
    });

    const search = params.search?.trim();
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = (params.sortOrder === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;

    const where: Prisma.ArticleWhereInput = {
      isDeleted: false,
      ...(params.status && ['ACTIVE', 'INACTIVE'].includes(params.status)
        ? { status: params.status as ArticleStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { articleNumber: { contains: search, mode: 'insensitive' } },
              { storageTemperature: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const validSortFields = [
      'articleNumber',
      'name',
      'pcsPerCarton',
      'weight',
      'status',
      'createdAt',
      'updatedAt',
    ];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
      }),
      prisma.article.count({ where }),
    ]);

    return createPaginatedResult(articles, total, page, limit);
  }

  async create(data: ArticleCreateData, userId?: string) {
    const article = await prisma.article.create({ data });

    await createAuditLog(prisma, {
      entityType: 'Article',
      entityId: article.id,
      action: 'CREATE',
      userId,
      articleId: article.id,
      changes: data,
    });

    return article;
  }

  async getById(id: string) {
    const article = await prisma.article.findFirst({
      where: { id, isDeleted: false },
    });
    if (!article) {
      throw Object.assign(new Error('Article not found'), { status: 404 });
    }
    return article;
  }

  async update(id: string, data: Partial<ArticleCreateData>, userId?: string) {
    const existing = await prisma.article.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw Object.assign(new Error('Article not found'), { status: 404 });
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(data) as Array<keyof ArticleCreateData>) {
      if (data[key] !== undefined && data[key] !== (existing as any)[key]) {
        changes[key] = { from: (existing as any)[key], to: data[key] };
      }
    }

    const updated = await prisma.article.update({ where: { id }, data });

    await createAuditLog(prisma, {
      entityType: 'Article',
      entityId: id,
      action: 'UPDATE',
      userId,
      articleId: id,
      changes,
    });

    return updated;
  }

  async delete(id: string, userId?: string) {
    const existing = await prisma.article.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw Object.assign(new Error('Article not found'), { status: 404 });
    }

    await prisma.article.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: 'INACTIVE' },
    });

    await createAuditLog(prisma, {
      entityType: 'Article',
      entityId: id,
      action: 'DELETE',
      userId,
      articleId: id,
    });
  }

  async importFromCSV(rows: any[], userId?: string) {
    const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (const rawRow of rows) {
      // Normalise keys: trim whitespace so "articleNumber " works too
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawRow)) {
        row[k.trim()] = String(v ?? '').trim();
      }

      // Skip rows that look like a re-pasted header row
      if (row.articleNumber?.toLowerCase() === 'articlenumber') {
        results.skipped++;
        continue;
      }

      // Skip completely empty rows
      if (!row.articleNumber && !row.name) {
        results.skipped++;
        continue;
      }

      try {
        const pcsPerCarton = parseInt(row.pcsPerCarton, 10);
        if (!row.articleNumber || !row.name || isNaN(pcsPerCarton) || pcsPerCarton <= 0) {
          results.errors.push(
            `Skipped: articleNumber="${row.articleNumber}", name="${row.name}" — missing required field (articleNumber, name, pcsPerCarton)`
          );
          continue;
        }

        // Use null (not undefined) for empty optional fields so Prisma clears the DB value.
        // undefined = "column not in CSV, leave DB value alone"
        // null      = "column present but empty, clear DB value"
        const parseOptionalFloat = (v: string | undefined): number | null | undefined => {
          if (v === undefined) return undefined;   // column absent → don't touch
          if (v.trim() === '') return null;         // column empty  → clear
          const n = parseFloat(v);
          return isNaN(n) ? null : n;
        };

        const weight      = parseOptionalFloat(row.weight);
        const pricePerPcs = parseOptionalFloat(row.pricePerPcs);
        const status: ArticleStatus = row.status?.trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

        const articleData = {
          name: row.name,
          pcsPerCarton,
          pricePerPcs,
          weight,
          storageTemperature: row.storageTemperature !== undefined
            ? (row.storageTemperature.trim() || null)
            : undefined,
          notes: row.notes !== undefined
            ? (row.notes.trim() || null)
            : undefined,
          status,
        };

        const existing = await prisma.article.findFirst({
          where: { articleNumber: row.articleNumber },
        });

        if (existing) {
          await prisma.article.update({
            where: { id: existing.id },
            data: { ...articleData, isDeleted: false, deletedAt: null },
          });
          results.updated++;
        } else {
          await prisma.article.create({
            data: { articleNumber: row.articleNumber, ...articleData },
          });
          results.created++;
        }
      } catch (err: any) {
        results.errors.push(
          `Error processing articleNumber="${row.articleNumber}": ${err.message}`
        );
      }
    }

    await createAuditLog(prisma, {
      entityType: 'Article',
      entityId: 'bulk-import',
      action: 'IMPORT_CSV',
      userId,
      changes: { created: results.created, updated: results.updated, skipped: results.skipped },
    });

    return results;
  }

  async exportCSV(): Promise<string> {
    const articles = await prisma.article.findMany({
      where: { isDeleted: false },
      orderBy: { articleNumber: 'asc' },
    });

    const headers = [
      'articleNumber',
      'name',
      'pcsPerCarton',
      'pricePerPcs',
      'weight',
      'storageTemperature',
      'notes',
      'status',
    ];

    const rows = articles.map((a) => ({
      articleNumber:      a.articleNumber,
      name:               a.name,
      pcsPerCarton:       a.pcsPerCarton,
      pricePerPcs:        a.pricePerPcs      ?? '',
      weight:             a.weight           ?? '',
      storageTemperature: a.storageTemperature ?? '',
      notes:              a.notes            ?? '',
      status:             a.status,
    }));

    return stringifyCSV(rows, headers);
  }
}
