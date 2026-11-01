import type { DoublePaymentReport } from '@/features/billing/services/double-payment-report';
import { formatChf } from '@/features/billing/services/payment-matching';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Renders the bills paid more than once as a PDF, in the look of the weekly report.
 *
 * Separate from `buildDoublePaymentReport`, so the arithmetic is tested on its own and this
 * file only decides what it looks like on a page.
 */

const ACCENT = '#47564C';
const INK = '#1C2321';
const MUTED = '#5D6D7E';
const RULE = '#E5E7E9';
const WARN = '#B23A2E';

const formatDate = (date: Date): string =>
  `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear())}`;

const formatIsoDate = (iso: string | undefined): string => {
  if (iso === undefined || iso === '') return '–';
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day ?? ''}.${month ?? ''}.${year ?? ''}`;
};

export async function renderDoublePaymentReportPdf(report: DoublePaymentReport): Promise<Buffer> {
  const pdfkitModule = await import('pdfkit');
  const PDFDocument = pdfkitModule.default;
  const { mm2pt } = await import('swissqrbill/utils');

  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    const document_ = new PDFDocument({
      autoFirstPage: true,
      size: 'A4',
      margins: { top: mm2pt(20), left: mm2pt(20), right: mm2pt(20), bottom: mm2pt(18) },
    });

    document_.on('data', (chunk: Buffer) => buffers.push(chunk));
    document_.on('end', () => resolve(Buffer.concat(buffers)));
    document_.on('error', reject);

    const left = mm2pt(20);
    const right = mm2pt(190);
    const contentWidth = right - left;

    // The brand font is optional: a checkout without the asset still renders a report.
    let hasBrandFont = false;
    try {
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-ExtraBold.ttf');
      if (fs.existsSync(fontPath)) {
        document_.registerFont('Montserrat-ExtraBold', fontPath);
        hasBrandFont = true;
      }
    } catch {
      // Falls back to Helvetica-Bold below.
    }
    const headingFont = (): string => (hasBrandFont ? 'Montserrat-ExtraBold' : 'Helvetica-Bold');

    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-conveniat27.png');
      if (fs.existsSync(logoPath)) {
        document_.image(logoPath, right - mm2pt(35), mm2pt(14), { width: mm2pt(35) });
      }
    } catch {
      // A missing logo is not worth failing a report over.
    }

    // ── Title ────────────────────────────────────────────────────────────────
    document_.font(headingFont()).fontSize(17).fillColor(ACCENT);
    document_.text('DOPPELZAHLUNGEN', left, mm2pt(20), { width: contentWidth - mm2pt(40) });
    document_.font('Helvetica').fontSize(9).fillColor(MUTED);
    document_.text(
      `Rechnungsübersicht conveniat27 · Stand ${formatDate(report.generatedAt)}`,
      left,
      document_.y + 2,
      { width: contentWidth - mm2pt(40) },
    );

    let y = document_.y + mm2pt(8);

    // ── Headline figures ─────────────────────────────────────────────────────
    const tiles = [
      { label: 'Rechnungen', value: String(report.entries.length) },
      { label: 'Zu viel bezahlt', value: formatChf(report.totalExcess) },
    ];
    const tileWidth = contentWidth / 4;
    for (const [index, tile] of tiles.entries()) {
      const x = left + index * tileWidth;
      document_.font('Helvetica').fontSize(8).fillColor(MUTED);
      document_.text(tile.label, x, y, { width: tileWidth - 6, lineBreak: false });
      document_.font('Helvetica-Bold').fontSize(16).fillColor(INK);
      document_.text(tile.value, x, y + mm2pt(3.5), { width: tileWidth - 6, lineBreak: false });
    }
    y += mm2pt(20);

    document_.font(headingFont()).fontSize(11).fillColor(ACCENT);
    document_.text('Offene Doppelzahlungen', left, y, { width: contentWidth });
    y = document_.y + 4;
    document_.moveTo(left, y).lineTo(right, y).lineWidth(0.8).strokeColor(ACCENT).stroke();
    y += 8;

    if (report.entries.length === 0) {
      document_.font('Helvetica').fontSize(9).fillColor(MUTED);
      document_.text('Keine offenen Doppelzahlungen.', left, y, { width: contentWidth });
      y = document_.y + mm2pt(4);
    }

    const columns = [
      { label: 'Anmeldung', width: contentWidth - mm2pt(105), align: 'left' as const },
      { label: 'Rechnung', width: mm2pt(25), align: 'left' as const },
      { label: 'Betrag', width: mm2pt(25), align: 'right' as const },
      { label: 'Bezahlt', width: mm2pt(25), align: 'right' as const },
      { label: 'Zu viel', width: mm2pt(30), align: 'right' as const },
    ];

    const drawRow = (cells: string[], font: string, colors: string[]): void => {
      let x = left;
      for (const [index, column] of columns.entries()) {
        document_
          .font(font)
          .fontSize(9)
          .fillColor(colors[index] ?? INK);
        document_.text(cells[index] ?? '', x, y, {
          width: column.width - 4,
          align: column.align,
          lineBreak: false,
          ellipsis: true,
        });
        x += column.width;
      }
      y += mm2pt(5.2);
    };

    const drawHeader = (): void => {
      drawRow(
        columns.map((column) => column.label),
        'Helvetica-Bold',
        columns.map(() => MUTED),
      );
      document_
        .moveTo(left, y - 3)
        .lineTo(right, y - 3)
        .lineWidth(0.5)
        .strokeColor(RULE)
        .stroke();
    };

    if (report.entries.length > 0) drawHeader();

    for (const entry of report.entries) {
      // Each bill stays on one page with its payments, so nobody reads half of it.
      const height = mm2pt(5.2) * 2 + mm2pt(4.4) * entry.payments.length + mm2pt(3);
      if (y + height > mm2pt(268)) {
        document_.addPage();
        y = mm2pt(20);
        drawHeader();
      }

      drawRow(
        [
          entry.fullName,
          entry.invoiceNumber,
          formatChf(entry.invoiceAmount),
          formatChf(entry.paid),
          formatChf(entry.excess),
        ],
        'Helvetica-Bold',
        [INK, INK, INK, INK, WARN],
      );
      if (entry.eventName !== '') {
        document_.font('Helvetica').fontSize(8).fillColor(MUTED);
        document_.text(entry.eventName, left, y - mm2pt(1.2), {
          width: contentWidth,
          lineBreak: false,
          ellipsis: true,
        });
        y += mm2pt(4);
      }

      for (const payment of entry.payments) {
        document_.font('Helvetica').fontSize(8).fillColor(MUTED);
        document_.text(
          `${formatIsoDate(payment.bookingDate)} · ${payment.transactionReference}` +
            (payment.payer === '' ? '' : ` · ${payment.payer}`),
          left + mm2pt(4),
          y,
          { width: contentWidth - mm2pt(34), lineBreak: false, ellipsis: true },
        );
        document_.text(formatChf(payment.amount), right - mm2pt(30), y, {
          width: mm2pt(30),
          align: 'right',
          lineBreak: false,
        });
        y += mm2pt(4.4);
      }

      document_.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(RULE).stroke();
      y += mm2pt(3);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    // Below the bottom margin, where pdfkit would otherwise start a new page for it.
    document_.page.margins.bottom = 0;
    document_.font('Helvetica').fontSize(7.5).fillColor(MUTED);
    document_.text(
      'Erledigt sich, sobald die Zahlung unter «Zahlungen» einer anderen Rechnung zugeordnet oder als zurückerstattet markiert ist.',
      left,
      mm2pt(283),
      { width: contentWidth, align: 'center', lineBreak: false },
    );

    document_.end();
  });
}
