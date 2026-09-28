import type {
  HofDashboardAnswer,
  HofDashboardEntry,
  HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  HOF_DASHBOARD_AREA_LABELS,
  HOF_ENTRY_STATUS_LABELS,
} from '@/features/hof-dashboard/constants';
import {
  formatDate,
  formatDateTime,
  formatFileSize,
  formatNumber,
  translate,
} from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import fs from 'node:fs';
import path from 'node:path';

/** One submission of a Hof, and what the PDF needs around it. */
export interface SubmissionPdfInput {
  hofName: string;
  form: Pick<HofDashboardForm, 'title' | 'area'>;
  entry: HofDashboardEntry;
  /** "Version 2" or the entry's title, as the dashboard heads the submission. */
  heading: string;
  /** The name each handed-in file has in the ZIP next to the PDF, by file id. */
  fileNames: ReadonlyMap<string, string>;
  locale: Locale;
  generatedAt: Date;
}

// the palette of the weekly Anmeldestand report
const ACCENT = '#47564C';
const INK = '#1C2321';
const MUTED = '#5D6D7E';
const RULE = '#E5E7E9';
const WARN = '#B23A2E';

const mm = (value: number): number => (value * 72) / 25.4;

const LEFT = mm(20);
const RIGHT = mm(190);
const WIDTH = RIGHT - LEFT;
const TOP = mm(20);
const BOTTOM = mm(275);

/** Characters Windows-1252 has beyond Latin-1, the rest of what Helvetica can draw. */
const WIN_ANSI_EXTRAS = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/**
 * Text Helvetica can draw: anything beyond Windows-1252, an emoji say, is a question mark
 * rather than the garbage the built-in fonts would print for it.
 */
const printable = (text: string): string =>
  Array.from(text, (character) => {
    const code = character.codePointAt(0) ?? 0;
    const drawable =
      character === '\n' || (code >= 0x20 && code <= 0xff) || WIN_ANSI_EXTRAS.has(character);
    return drawable ? character : '?';
  }).join('');

/** The ending of a file name in capitals, "PDF", as a short type next to its size. */
const fileType = (name: string): string | undefined => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : undefined;
};

/**
 * One submission as a PDF: everything the dashboard shows of it, answers, files, materials and
 * the Ressort's answer, and for a reviewer the history of that answer, so the ZIP of a Hof
 * reads without the dashboard.
 */
export async function renderSubmissionPdf(input: SubmissionPdfInput): Promise<Buffer> {
  const { entry, locale } = input;
  const { default: PDFDocument } = await import('pdfkit');

  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    const document_ = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: TOP, left: LEFT, right: mm(20), bottom: mm(22) },
      info: { Title: `${input.form.title} – ${input.heading}`, Author: input.hofName },
    });
    document_.on('data', (chunk: Buffer) => buffers.push(chunk));
    document_.on('end', () => resolve(Buffer.concat(buffers)));
    document_.on('error', reject);

    // The brand font is optional: a checkout without the asset still renders the PDF.
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-ExtraBold.ttf');
    const headingFont = fs.existsSync(fontPath) ? 'Montserrat-ExtraBold' : 'Helvetica-Bold';
    if (headingFont !== 'Helvetica-Bold') document_.registerFont(headingFont, fontPath);
    const logoPath = path.join(process.cwd(), 'public', 'logo-conveniat27.png');
    if (fs.existsSync(logoPath))
      document_.image(logoPath, RIGHT - mm(35), mm(14), { width: mm(35) });

    let y = TOP;
    /** A new page unless `height` still fits above the footer. */
    const keep = (height: number): void => {
      if (y + height <= BOTTOM) return;
      document_.addPage();
      y = TOP;
    };
    /** Text across `width` from `x`, flowing onto the next page when it runs long. */
    const write = (
      text: string,
      options: { x?: number; width?: number; size?: number; bold?: boolean; color?: string } = {},
    ): void => {
      const x = options.x ?? LEFT;
      const width = options.width ?? RIGHT - x;
      document_
        .font(options.bold === true ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(options.size ?? 9.5)
        .fillColor(options.color ?? INK);
      keep(Math.min(document_.heightOfString(printable(text), { width }), mm(20)));
      document_.text(printable(text), x, y, { width });
      y = document_.y;
    };
    const sectionHeading = (text: string): void => {
      keep(mm(18));
      y += mm(4);
      document_
        .font(headingFont)
        .fontSize(11)
        .fillColor(ACCENT)
        .text(text, LEFT, y, { width: WIDTH });
      y = document_.y + 4;
      document_.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.8).strokeColor(ACCENT).stroke();
      y += 8;
    };
    const rule = (): void => {
      document_.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(RULE).stroke();
    };

    // ── Title ──────────────────────────────────────────────────────────────────
    document_.font(headingFont).fontSize(17).fillColor(ACCENT);
    document_.text(input.form.title, LEFT, y, { width: WIDTH - mm(40) });
    document_.font('Helvetica').fontSize(9).fillColor(MUTED);
    document_.text(printable(`${input.hofName} · ${input.heading}`), LEFT, document_.y + 2, {
      width: WIDTH - mm(40),
    });
    y = Math.max(document_.y, mm(30)) + mm(8);

    // ── Where it stands ────────────────────────────────────────────────────────
    const status = HOF_ENTRY_STATUS_LABELS[entry.status][locale];
    const tiles = [
      { label: translate('hof', locale), value: input.hofName },
      {
        label: translate('pdfArea', locale),
        value: HOF_DASHBOARD_AREA_LABELS[input.form.area][locale],
      },
      {
        label: translate('pdfSubmittedAt', locale),
        value: formatDateTime(entry.submittedAt, locale),
      },
      {
        label: translate('reviewStatus', locale),
        value: entry.final ? `${status}, ${translate('finalShort', locale)}` : status,
        warn: entry.status === 'revisionRequired',
      },
    ];
    const tileWidth = WIDTH / 2;
    for (const [index, tile] of tiles.entries()) {
      const x = LEFT + (index % 2) * tileWidth;
      const top = y + Math.floor(index / 2) * mm(13);
      document_.font('Helvetica').fontSize(8).fillColor(MUTED);
      document_.text(tile.label, x, top, { width: tileWidth - 8, lineBreak: false });
      document_
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(tile.warn === true ? WARN : INK);
      document_.text(printable(tile.value), x, top + mm(3.5), {
        width: tileWidth - 8,
        lineBreak: false,
      });
    }
    y += Math.ceil(tiles.length / 2) * mm(13);

    // ── Answers ────────────────────────────────────────────────────────────────
    const writeAnswer = (answer: HofDashboardAnswer): void => {
      // a label, and a section heading, go to the next page with the first line under them
      keep(mm(20));
      write(answer.label, { size: 8, bold: true, color: MUTED });
      y += 2;
      switch (answer.kind) {
        case 'text': {
          write(answer.text);
          break;
        }
        case 'files': {
          for (const file of answer.files) {
            const details = [
              fileType(file.name),
              file.size === undefined ? undefined : formatFileSize(file.size, locale),
            ].filter((part) => part !== undefined);
            keep(mm(6));
            const top = y;
            write(input.fileNames.get(file.id) ?? file.name, { width: WIDTH - mm(30) });
            document_.font('Helvetica').fontSize(8).fillColor(MUTED);
            document_.text(details.join(' · '), RIGHT - mm(30), top + 1, {
              width: mm(30),
              align: 'right',
              lineBreak: false,
            });
            y += 3;
          }
          break;
        }
        case 'materials': {
          let section: string | undefined;
          for (const line of answer.materials) {
            if (line.section !== undefined && line.section !== section) {
              keep(mm(14));
              y += 3;
              write(line.section.toUpperCase(), { size: 7.5, bold: true, color: MUTED });
              y += 2;
            }
            section = line.section;
            keep(mm(6));
            const top = y;
            write(line.name, { width: WIDTH - mm(25) });
            document_.font('Helvetica-Bold').fontSize(9.5).fillColor(INK);
            document_.text(formatNumber(line.quantity, locale), RIGHT - mm(25), top, {
              width: mm(25),
              align: 'right',
              lineBreak: false,
            });
            y += 3;
            rule();
            y += 3;
          }
          break;
        }
      }
      y += mm(4);
    };

    sectionHeading(translate('pdfAnswers', locale));
    if (entry.answers.length === 0) write(translate('pdfNoAnswers', locale), { color: MUTED });
    for (const answer of entry.answers) writeAnswer(answer);

    // ── The Ressort's answer ───────────────────────────────────────────────────
    sectionHeading(translate('reviewTitle', locale));
    if (entry.feedback === undefined || entry.feedback === '') {
      write(translate(entry.status === 'submitted' ? 'pdfNoReview' : 'pdfNoFeedback', locale), {
        color: MUTED,
      });
    } else {
      write(entry.feedback);
      if (entry.feedbackBy !== undefined) {
        y += 2;
        write(
          translate('feedbackBy', locale, {
            name: entry.feedbackBy.name,
            date: formatDate(entry.feedbackBy.at, locale),
          }),
          { size: 8, color: MUTED },
        );
      }
    }

    // ── History, for the reviewers ─────────────────────────────────────────────
    if (entry.reviewLog.length > 0) {
      sectionHeading(translate('reviewHistory', locale, { n: entry.reviewLog.length }));
      for (const change of entry.reviewLog) {
        keep(mm(10));
        const state = HOF_ENTRY_STATUS_LABELS[change.status][locale];
        write(
          [
            formatDateTime(change.at, locale),
            change.by === '' ? translate('reviewerUnknown', locale) : change.by,
            change.final ? `${state}, ${translate('finalShort', locale)}` : state,
          ].join(' · '),
          { size: 8, bold: true, color: MUTED },
        );
        if (change.feedback !== '') {
          y += 1;
          write(change.feedback, { size: 9 });
        }
        y += 3;
        rule();
        y += 4;
      }
    }

    // ── Footer on every page ───────────────────────────────────────────────────
    const range = document_.bufferedPageRange();
    const footer = translate('pdfFooter', locale, {
      date: formatDateTime(input.generatedAt.toISOString(), locale),
    });
    for (let index = range.start; index < range.start + range.count; index += 1) {
      document_.switchToPage(index);
      // below the bottom margin, where writing would otherwise open a new page
      document_.page.margins.bottom = 0;
      document_.font('Helvetica').fontSize(7.5).fillColor(MUTED);
      document_.text(footer, LEFT, mm(283), { width: WIDTH, lineBreak: false });
      document_.text(
        translate('pdfPage', locale, { n: index - range.start + 1, total: range.count }),
        LEFT,
        mm(283),
        { width: WIDTH, align: 'right', lineBreak: false },
      );
    }

    document_.end();
  });
}
