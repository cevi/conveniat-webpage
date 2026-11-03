import { formatChf } from '@/features/billing-core/money';
import type {
  DoublePaymentReport,
  ResolvedDoublePaymentPayment,
} from '@/features/billing/services/double-payment-report';
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

/** Where the money of a payment went: `zählt hier CHF 160.00`, `zugeordnet zu Mia Muster (2026-0412) CHF 160.00`. */
const describeFate = (payment: ResolvedDoublePaymentPayment): string => {
  if (payment.refundedDate !== undefined) {
    return `zurückerstattet am ${formatIsoDate(payment.refundedDate)}`;
  }
  const parts = [
    ...(payment.countsHere > 0 ? [`zählt hier ${formatChf(payment.countsHere)}`] : []),
    ...payment.elsewhere.map(
      (share) =>
        `zugeordnet zu ${share.fullName} (${share.invoiceNumber}) ${formatChf(share.amount)}`,
    ),
  ];
  return parts.length === 0 ? 'keiner Rechnung zugeordnet' : parts.join(' · ');
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
      { label: 'Offen', value: String(report.entries.length) },
      { label: 'Zu viel bezahlt', value: formatChf(report.totalExcess) },
      { label: 'Erledigt', value: String(report.resolved.length) },
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

    type Column = (typeof columns)[number];

    const drawRow = (
      cells: string[],
      font: string,
      colors: string[],
      rowColumns: Column[] = columns,
    ): void => {
      let x = left;
      for (const [index, column] of rowColumns.entries()) {
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

    const drawHeader = (rowColumns: Column[] = columns): void => {
      drawRow(
        rowColumns.map((column) => column.label),
        'Helvetica-Bold',
        rowColumns.map(() => MUTED),
        rowColumns,
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

    // ── Resolved ─────────────────────────────────────────────────────────────
    // The flag clears once a payment is moved or refunded, and with it the bill would leave
    // the report. Finance still has to see later what was paid twice and where it went.
    const resolvedColumns: Column[] = [
      { label: 'Anmeldung', width: contentWidth - mm2pt(105), align: 'left' },
      { label: 'Rechnung', width: mm2pt(25), align: 'left' },
      { label: 'Betrag', width: mm2pt(25), align: 'right' },
      { label: 'Erkannt', width: mm2pt(25), align: 'right' },
      { label: 'Erledigt', width: mm2pt(30), align: 'right' },
    ];

    if (y + mm2pt(25) > mm2pt(268)) {
      document_.addPage();
      y = mm2pt(20);
    } else {
      y += mm2pt(6);
    }
    document_.font(headingFont()).fontSize(11).fillColor(ACCENT);
    document_.text('Erledigte Doppelzahlungen', left, y, { width: contentWidth });
    y = document_.y + 4;
    document_.moveTo(left, y).lineTo(right, y).lineWidth(0.8).strokeColor(ACCENT).stroke();
    y += 8;

    if (report.resolved.length === 0) {
      document_.font('Helvetica').fontSize(9).fillColor(MUTED);
      document_.text('Bisher keine erledigten Doppelzahlungen.', left, y, { width: contentWidth });
      y = document_.y + mm2pt(4);
    } else {
      drawHeader(resolvedColumns);
    }

    for (const entry of report.resolved) {
      const height = mm2pt(5.2) + mm2pt(4) * 2 + mm2pt(4.4) * entry.payments.length + mm2pt(3);
      if (y + height > mm2pt(268)) {
        document_.addPage();
        y = mm2pt(20);
        drawHeader(resolvedColumns);
      }

      drawRow(
        [
          entry.fullName,
          entry.invoiceNumber,
          formatChf(entry.invoiceAmount),
          formatIsoDate(entry.detectedAt),
          formatIsoDate(entry.resolvedAt),
        ],
        'Helvetica-Bold',
        [INK, INK, INK, INK, INK],
        resolvedColumns,
      );
      const details = [entry.eventName, entry.resolvedBy].filter((detail) => detail !== '');
      if (details.length > 0) {
        document_.font('Helvetica').fontSize(8).fillColor(MUTED);
        document_.text(details.join(' · '), left, y - mm2pt(1.2), {
          width: contentWidth,
          lineBreak: false,
          ellipsis: true,
        });
        y += mm2pt(4);
      }

      for (const payment of entry.payments) {
        document_.font('Helvetica').fontSize(8).fillColor(MUTED);
        document_.text(
          `${formatIsoDate(payment.bookingDate)} · ${payment.transactionReference} · ${formatChf(payment.amount)}` +
            (payment.payer === '' ? '' : ` · ${payment.payer}`),
          left + mm2pt(4),
          y,
          { width: contentWidth / 2 - mm2pt(4), lineBreak: false, ellipsis: true },
        );
        document_.text(describeFate(payment), left + contentWidth / 2, y, {
          width: contentWidth / 2,
          align: 'right',
          lineBreak: false,
          ellipsis: true,
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
