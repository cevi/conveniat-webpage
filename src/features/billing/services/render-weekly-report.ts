import type { WeeklyReport } from '@/features/billing/services/weekly-report';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Renders the weekly registration report as a PDF.
 *
 * Deliberately separate from `buildWeeklyReport`: the arithmetic is testable on its own,
 * and this file only decides what the numbers look like on a page.
 */

const ACCENT = '#47564C';
const INK = '#1C2321';
const MUTED = '#5D6D7E';
const RULE = '#E5E7E9';
const WARN = '#B23A2E';

const formatDate = (date: Date): string =>
  `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear())}`;

export async function renderWeeklyReportPdf(report: WeeklyReport): Promise<Buffer> {
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
    document_.text('ANMELDESTAND', left, mm2pt(20), { width: contentWidth - mm2pt(40) });
    document_.font('Helvetica').fontSize(9).fillColor(MUTED);
    document_.text(
      `Wochenbericht conveniat27 · Stand ${formatDate(report.generatedAt)}`,
      left,
      document_.y + 2,
      { width: contentWidth - mm2pt(40) },
    );

    let y = document_.y + mm2pt(8);

    // ── Headline figures ─────────────────────────────────────────────────────
    const tiles: { label: string; value: string; muted?: boolean }[] = [
      { label: 'Anmeldungen', value: String(report.totals.participants) },
      { label: 'Neu diese Woche', value: `+${String(report.newSinceLastWeek)}` },
      { label: 'Rechnung erstellt', value: String(report.totals.billed) },
      { label: 'Rechnung versendet', value: String(report.totals.sent) },
      { label: 'Offen', value: String(report.totals.pending), muted: true },
      { label: 'Blockiert', value: String(report.totals.blocked), muted: true },
    ];

    const tileWidth = contentWidth / 3;
    const tileHeight = mm2pt(16);
    for (const [index, tile] of tiles.entries()) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = left + column * tileWidth;
      const top = y + row * tileHeight;

      document_.font('Helvetica').fontSize(8).fillColor(MUTED);
      document_.text(tile.label, x, top, { width: tileWidth - 6, lineBreak: false });
      document_
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(tile.muted === true ? MUTED : INK);
      document_.text(tile.value, x, top + mm2pt(3.5), { width: tileWidth - 6, lineBreak: false });
    }
    y += Math.ceil(tiles.length / 3) * tileHeight + mm2pt(4);

    const sectionHeading = (text: string): void => {
      document_.font(headingFont()).fontSize(11).fillColor(ACCENT);
      document_.text(text, left, y, { width: contentWidth });
      y = document_.y + 4;
      document_.moveTo(left, y).lineTo(right, y).lineWidth(0.8).strokeColor(ACCENT).stroke();
      y += 8;
    };

    // ── Anmeldestand nach Abteilung ──────────────────────────────────────────
    sectionHeading('Anmeldestand nach Abteilung');

    const columns = [
      { key: 'name', label: 'Abteilung', width: contentWidth - mm2pt(88), align: 'left' as const },
      { key: 'total', label: 'Total', width: mm2pt(22), align: 'right' as const },
      { key: 'billed', label: 'Verrechnet', width: mm2pt(22), align: 'right' as const },
      { key: 'sent', label: 'Versendet', width: mm2pt(22), align: 'right' as const },
      { key: 'blocked', label: 'Blockiert', width: mm2pt(22), align: 'right' as const },
    ];

    const drawRow = (
      cells: string[],
      options: { bold?: boolean; color?: string; rule?: boolean } = {},
    ): void => {
      document_
        .font(options.bold === true ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .fillColor(options.color ?? INK);
      let x = left;
      for (const [index, column] of columns.entries()) {
        document_.text(cells[index] ?? '', x, y, {
          width: column.width,
          align: column.align,
          lineBreak: false,
        });
        x += column.width;
      }
      y += mm2pt(5.2);
      if (options.rule === true) {
        document_
          .moveTo(left, y - 3)
          .lineTo(right, y - 3)
          .lineWidth(0.5)
          .strokeColor(RULE)
          .stroke();
      }
    };

    drawRow(
      columns.map((column) => column.label),
      { bold: true, color: MUTED, rule: true },
    );

    for (const row of report.abteilungen) {
      // A new page before the table runs into the bottom margin, so a long list keeps
      // its header rather than silently colliding with the footer.
      if (y > mm2pt(262)) {
        document_.addPage();
        y = mm2pt(20);
        drawRow(
          columns.map((column) => column.label),
          { bold: true, color: MUTED, rule: true },
        );
      }
      drawRow(
        [
          row.name,
          String(row.total),
          String(row.billed),
          String(row.sent),
          row.blocked === 0 ? '–' : String(row.blocked),
        ],
        { color: row.blocked > 0 ? INK : INK, rule: true },
      );
    }

    drawRow(
      [
        'Total',
        String(report.totals.participants),
        String(report.totals.billed),
        String(report.totals.sent),
        String(report.totals.blocked),
      ],
      { bold: true },
    );

    y += mm2pt(4);

    // ── Probleme ─────────────────────────────────────────────────────────────
    if (y > mm2pt(230)) {
      document_.addPage();
      y = mm2pt(20);
    }
    sectionHeading('Mögliche Probleme');

    if (report.problems.length === 0) {
      document_.font('Helvetica').fontSize(9).fillColor(MUTED);
      document_.text('Keine offenen Punkte.', left, y, { width: contentWidth });
      y = document_.y + mm2pt(4);
    }

    for (const group of report.problems) {
      if (y > mm2pt(258)) {
        document_.addPage();
        y = mm2pt(20);
      }
      document_.font('Helvetica-Bold').fontSize(9).fillColor(INK);
      document_.text(group.title, left, y, { width: contentWidth, lineBreak: false });
      y += mm2pt(5);

      for (const entry of group.entries) {
        if (y > mm2pt(268)) {
          document_.addPage();
          y = mm2pt(20);
        }
        document_.font('Helvetica').fontSize(9).fillColor(MUTED);
        document_.text(entry.label, left + mm2pt(4), y, {
          width: contentWidth - mm2pt(24),
          lineBreak: false,
        });
        document_.font('Helvetica-Bold').fillColor(entry.count > 0 ? WARN : MUTED);
        document_.text(String(entry.count), right - mm2pt(20), y, {
          width: mm2pt(20),
          align: 'right',
          lineBreak: false,
        });
        y += mm2pt(4.6);
      }
      y += mm2pt(2);
    }

    // ── Systemzustand ────────────────────────────────────────────────────────
    if (y > mm2pt(240)) {
      document_.addPage();
      y = mm2pt(20);
    }
    sectionHeading('Systemzustand');

    for (const entry of report.health) {
      document_.font('Helvetica').fontSize(9).fillColor(MUTED);
      document_.text(entry.label, left, y, { width: contentWidth - mm2pt(60), lineBreak: false });
      document_.font('Helvetica-Bold').fillColor(entry.ok ? INK : WARN);
      document_.text(`${entry.ok ? '' : '! '}${entry.value}`, right - mm2pt(60), y, {
        width: mm2pt(60),
        align: 'right',
        lineBreak: false,
      });
      y += mm2pt(5);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    document_.font('Helvetica').fontSize(7.5).fillColor(MUTED);
    document_.text(
      'Automatisch erstellt aus der Rechnungsverwaltung. Zahlen entsprechen dem letzten Cevi.DB-Abgleich.',
      left,
      mm2pt(283),
      { width: contentWidth, align: 'center', lineBreak: false },
    );

    document_.end();
  });
}
