import 'dotenv/config';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const MM = 2.8346; // points per mm at 72 DPI

// Page / cell dimensions in points
const A6W  = Math.round(105 * MM * 100) / 100; // 297.6
const A6H  = Math.round(148 * MM * 100) / 100; // 419.5
const A4W  = Math.round(210 * MM * 100) / 100; // 595.3
const A4H  = Math.round(297 * MM * 100) / 100; // 841.9
const T4W  = 4 * 72;  // 288
const T4H  = 6 * 72;  // 432

const COMPANY_NAME    = 'Biebelhausener Mühle seit 1647 GmbH';
const COMPANY_TAGLINE = 'Backkultur mit Tradition';
const COMPANY_ADDRESS = 'Bergstraße 2-6  |  54441 Ayl-Biebelhausen';
const COMPANY_CONTACT = 'E: bestellung@bhm.de  |  T: +49 6581-9148 319  |  Fax: +49 6581-9148 388';
const LOGO_PATH       = path.join(process.cwd(), 'assets', 'logo.png');
const NAVY            = '#1e3a5f';
const GOLD            = '#8a6a1a';
const FOOTER_H        = 28; // points reserved at bottom for company footer

type LabelSizeKey = 'A6' | 'THERMAL_4X6' | 'A4_HALF' | 'A4_QUARTER';

function loadLogo(): Buffer | null {
  try {
    if (fs.existsSync(LOGO_PATH)) return fs.readFileSync(LOGO_PATH);
  } catch { /* label prints without logo */ }
  return null;
}

function buildQRContent(order: any): string {
  const pickupDate = order.pickupDate
    ? format(new Date(order.pickupDate), 'dd.MM.yyyy')
    : 'TBD';
  const pickupTime = order.pickupTime ? ` ${order.pickupTime}` : '';
  const items = order.items
    .map((i: any) => `ArtNr:${i.article.articleNumber} - ${i.article.name} - ${i.totalCartons}Ktn`)
    .join('\n');

  return [
    `Auftrag: ${order.orderNumber}`,
    `Kunde: [${order.customer.customerNumber}] ${order.customer.orgName}`,
    order.customer.contactPerson ? `Kontakt: ${order.customer.contactPerson}` : '',
    order.customer.phone         ? `Tel: ${order.customer.phone}`             : '',
    order.customer.email         ? `E-Mail: ${order.customer.email}`          : '',
    `Abholung: ${pickupDate}${pickupTime}`,
    `Artikel:\n${items}`,
  ].filter(Boolean).join('\n');
}

export class LabelService {

  async generatePDF(orderIds: string[], size: LabelSizeKey): Promise<Buffer> {
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, isDeleted: false },
      include: { customer: true, items: { include: { article: true } } },
    });

    if (orders.length === 0) {
      throw Object.assign(new Error('No valid orders found'), { status: 404 });
    }

    const logoBuffer = loadLogo();

    return new Promise(async (resolve, reject) => {
      const chunks: Buffer[] = [];

      // ── A4 Quarter: 4 labels per page (2 × 2 grid, each cell = A6) ──────────
      if (size === 'A4_QUARTER') {
        const doc = new PDFDocument({ size: [A4W, A4H], margin: 0, autoFirstPage: false });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end',  () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        for (let i = 0; i < orders.length; i += 4) {
          doc.addPage();

          const cells = [
            { ox: 0,    oy: 0    },
            { ox: A4W / 2, oy: 0    },
            { ox: 0,    oy: A4H / 2 },
            { ox: A4W / 2, oy: A4H / 2 },
          ];

          for (let j = 0; j < 4; j++) {
            if (i + j >= orders.length) break;
            const { ox, oy } = cells[j];
            await this.drawLabel(doc, orders[i + j], logoBuffer, ox, oy, A4W / 2, A4H / 2, 'A6');
          }

          // Cut lines — vertical
          doc.save()
            .dash(5, { space: 3 })
            .moveTo(A4W / 2, 0).lineTo(A4W / 2, A4H)
            .strokeColor('#bbbbbb').lineWidth(0.5).stroke()
            .restore();

          // Cut lines — horizontal
          doc.save()
            .dash(5, { space: 3 })
            .moveTo(0, A4H / 2).lineTo(A4W, A4H / 2)
            .strokeColor('#bbbbbb').lineWidth(0.5).stroke()
            .restore();
        }

        doc.end();

      // ── A4 Half: 2 labels per page (top / bottom) ────────────────────────────
      } else if (size === 'A4_HALF') {
        const doc = new PDFDocument({ size: [A4W, A4H], margin: 0, autoFirstPage: false });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end',  () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        for (let i = 0; i < orders.length; i += 2) {
          doc.addPage();

          await this.drawLabel(doc, orders[i], logoBuffer, 0, 0, A4W, A4H / 2, 'A6');

          // Dashed cut line
          doc.save()
            .dash(5, { space: 3 })
            .moveTo(0, A4H / 2).lineTo(A4W, A4H / 2)
            .strokeColor('#bbbbbb').lineWidth(0.5).stroke()
            .restore();

          if (i + 1 < orders.length) {
            await this.drawLabel(doc, orders[i + 1], logoBuffer, 0, A4H / 2, A4W, A4H / 2, 'A6');
          }
        }

        doc.end();

      // ── A6 / Thermal: one label per page ─────────────────────────────────────
      } else {
        const [pageW, pageH] = size === 'A6' ? [A6W, A6H] : [T4W, T4H];
        const doc = new PDFDocument({ size: [pageW, pageH], margin: 0, autoFirstPage: false });
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end',  () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        for (const order of orders) {
          doc.addPage();
          await this.drawLabel(doc, order, logoBuffer, 0, 0, pageW, pageH, size);
        }

        doc.end();
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Core label renderer — all sizes share this function
  // ────────────────────────────────────────────────────────────────────────────
  private async drawLabel(
    doc: PDFKit.PDFDocument,
    order: any,
    logoBuffer: Buffer | null,
    ox: number,   // cell origin X
    oy: number,   // cell origin Y
    W: number,    // cell width
    H: number,    // cell height
    size: 'A6' | 'THERMAL_4X6',
  ): Promise<void> {

    const isSmall = size === 'THERMAL_4X6';
    const mg  = isSmall ? 10 : 12;            // margin
    const cW  = W - mg * 2;                   // content width
    const x   = ox + mg;
    let   y   = oy + mg;

    // QR code content — full order details
    const qrContent = buildQRContent(order);
    const qrSize    = isSmall ? 65 : 75;
    const qrBuffer  = await QRCode.toBuffer(qrContent, {
      width: qrSize * 3,   // render higher resolution, PDFKit scales it down
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    // ── COMPANY HEADER ───────────────────────────────────────────────────────
    const logoSz = isSmall ? 28 : 34;

    if (logoBuffer) {
      doc.image(logoBuffer, x, y, { width: logoSz, height: logoSz });
      doc.fontSize(isSmall ? 8.5 : 10.5)
        .font('Helvetica-Bold').fillColor(NAVY)
        .text(COMPANY_NAME, x + logoSz + 5, y + 2, { width: cW - logoSz - 5 });
      doc.fontSize(6.5)
        .font('Helvetica').fillColor(GOLD)
        .text(COMPANY_TAGLINE, x + logoSz + 5, y + (isSmall ? 14 : 17), { width: cW - logoSz - 5 });
    } else {
      doc.fontSize(isSmall ? 8.5 : 10.5)
        .font('Helvetica-Bold').fillColor(NAVY)
        .text(COMPANY_NAME, x, y, { width: cW });
      doc.fontSize(6.5)
        .font('Helvetica').fillColor(GOLD)
        .text(COMPANY_TAGLINE, x, y + 14, { width: cW });
    }

    y += logoSz + 5;
    doc.fillColor('black');

    // Blue header rule
    doc.rect(ox, y, W, 1.5).fillColor(NAVY).fill();
    doc.fillColor('black');
    y += 6;

    // ── AUFTRAG (Order Number) ───────────────────────────────────────────────
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#666')
      .text('AUFTRAG / ORDER', x, y);
    y += 9;
    doc.fontSize(isSmall ? 10 : 12).font('Helvetica-Bold').fillColor(NAVY)
      .text(order.orderNumber, x, y);
    doc.fillColor('black');
    y += isSmall ? 14 : 17;

    // Thin rule
    doc.moveTo(x, y).lineTo(x + cW, y).strokeColor('#dddddd').lineWidth(0.4).stroke();
    doc.lineWidth(1);
    y += 5;

    // ── CUSTOMER (left) + QR CODE (right) ───────────────────────────────────
    const custW     = cW - qrSize - 8;
    const custStartY = y;

    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#666').text('KUNDE / CUSTOMER', x, y);
    y += 9;

    doc.fontSize(isSmall ? 7.5 : 8.5).font('Helvetica-Bold').fillColor('black')
      .text(`[${order.customer.customerNumber}]  ${order.customer.orgName}`, x, y, { width: custW });
    y += isSmall ? 12 : 13;

    if (order.customer.contactPerson) {
      doc.fontSize(7.5).font('Helvetica').fillColor('#333')
        .text(`Kontakt:  ${order.customer.contactPerson}`, x, y, { width: custW });
      y += 10;
    }
    if (order.customer.phone) {
      doc.fontSize(7.5).font('Helvetica').fillColor('#333')
        .text(`Tel:  ${order.customer.phone}`, x, y, { width: custW });
      y += 10;
    }
    if (order.customer.email) {
      doc.fontSize(7.5).font('Helvetica').fillColor('#333')
        .text(`E-Mail:  ${order.customer.email}`, x, y, { width: custW });
      y += 10;
    }

    // QR code — right column, aligned with customer section top
    const qrX = ox + W - mg - qrSize;
    doc.image(qrBuffer, qrX, custStartY + 9, { width: qrSize });

    const custBottomY = Math.max(y, custStartY + 9 + qrSize + 4);
    y = custBottomY + 3;

    doc.fillColor('black');

    // Thin rule
    doc.moveTo(x, y).lineTo(x + cW, y).strokeColor('#dddddd').lineWidth(0.4).stroke();
    doc.lineWidth(1);
    y += 5;

    // ── ABHOLUNG (Pickup) ────────────────────────────────────────────────────
    const pickupDate = order.pickupDate
      ? format(new Date(order.pickupDate), 'dd.MM.yyyy')
      : 'TBD';
    const pickupTime = order.pickupTime ? `  ${order.pickupTime}` : '';

    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#666').text('ABHOLUNG / PICKUP', x, y);
    y += 9;
    doc.fontSize(isSmall ? 9.5 : 11).font('Helvetica-Bold').fillColor(NAVY)
      .text(`${pickupDate}${pickupTime}`, x, y, { width: cW });
    doc.fillColor('black');
    y += isSmall ? 14 : 16;

    // Thin rule
    doc.moveTo(x, y).lineTo(x + cW, y).strokeColor('#dddddd').lineWidth(0.4).stroke();
    doc.lineWidth(1);
    y += 5;

    // ── ARTIKEL (Items) ──────────────────────────────────────────────────────
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#666').text('ARTIKEL', x, y);
    y += 9;

    for (const item of order.items) {
      const line = `•  ArtNr: ${item.article.articleNumber} - ${item.article.name} - ${item.totalCartons} Kartons`;
      doc.fontSize(isSmall ? 7 : 7.5).font('Helvetica').fillColor('black')
        .text(line, x + 2, y, { width: cW - 2 });
      y += 11;
    }

    // ── COMPANY FOOTER ───────────────────────────────────────────────────────
    const footerY = oy + H - FOOTER_H;

    // Thin separator above footer
    doc.moveTo(ox + mg, footerY)
      .lineTo(ox + W - mg, footerY)
      .strokeColor('#cccccc').lineWidth(0.4).stroke();
    doc.lineWidth(1);

    // Row 1: company name (bold, navy)
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(NAVY)
      .text(COMPANY_NAME, ox + mg, footerY + 3, { width: W - mg * 2, align: 'center' });

    // Row 2: address | contact (grey, very small)
    doc.fontSize(5.8).font('Helvetica').fillColor('#666')
      .text(COMPANY_ADDRESS, ox + mg, footerY + 12, { width: W - mg * 2, align: 'center' });

    doc.fontSize(5.5).font('Helvetica').fillColor('#888')
      .text(COMPANY_CONTACT, ox + mg, footerY + 20, { width: W - mg * 2, align: 'center' });

    doc.fillColor('black');

    // ── OUTER BORDER ─────────────────────────────────────────────────────────
    doc.rect(ox + 0.5, oy + 0.5, W - 1, H - 1)
      .strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.lineWidth(1).strokeColor('black').fillColor('black');
  }

  async getByOrder(orderId: string) {
    return prisma.label.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
