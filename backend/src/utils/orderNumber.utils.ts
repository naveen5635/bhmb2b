import { PrismaClient } from '@prisma/client';

/**
 * Generate a unique order number in format ORD-YYYYMMDD-XXXX
 * Finds the last order created today and increments its sequence number.
 */
export async function generateOrderNumber(prisma: PrismaClient): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `ORD-${dateStr}-`;

  // Find the last order created today by matching the orderNumber prefix
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let nextSeq = 1;

  if (lastOrder) {
    // Parse the sequence number from the last order (e.g. "ORD-20240115-0042" -> 42)
    const parts = lastOrder.orderNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(4, '0');
  return `${prefix}${seqStr}`;
}
