import type { BillCreditor } from '@/features/billing-core/creditor';
import { formatChf } from '@/features/billing-core/money';
import type { VisitDayBillLine } from '@/features/visit-day/billing/visit-day-bill-amount';
import type { Locale, StaticTranslationString } from '@/types/types';
import fs from 'node:fs';
import path from 'node:path';

/** Everything a Besuchstag bill prints. */
export interface VisitDayBillPdf {
  locale: Locale;
  creditor: BillCreditor;
  debtor: { name: string; street?: string; postalCode?: string; city?: string };
  title: string;
  letterText: string;
  invoiceNumber: string;
  registrationNumber: string;
  reference: string;
  /** `dd.MM.yyyy` */
  visitDay: string;
  /** `dd.MM.yyyy` */
  issuedOn: string;
  /** `dd.MM.yyyy` */
  dueOn: string;
  lines: VisitDayBillLine[];
  total: number;
  vatAmount: number;
  vatRate: number;
}

const labels = {
  invoiceNumber: { de: 'Rechnungsnummer', fr: 'Numéro de facture', en: 'Bill number' },
  registrationNumber: {
    de: 'Anmeldenummer',
    fr: 'Numéro d’inscription',
    en: 'Registration number',
  },
  visitDay: { de: 'Besuchstag', fr: 'Journée des visites', en: 'Visiting day' },
  issuedOn: { de: 'Rechnungsdatum', fr: 'Date de la facture', en: 'Date of bill' },
  dueOn: { de: 'Zahlbar bis', fr: 'Payable jusqu’au', en: 'Payable by' },
  item: { de: 'Position', fr: 'Désignation', en: 'Item' },
  quantity: { de: 'Anzahl', fr: 'Quantité', en: 'Quantity' },
  unitPrice: { de: 'Preis', fr: 'Prix', en: 'Price' },
  amount: { de: 'Betrag', fr: 'Montant', en: 'Amount' },
  total: { de: 'Total', fr: 'Total', en: 'Total' },
  vatIncluded: {
    de: 'inkl. {{rate}} % MWST',
    fr: 'TVA {{rate}} % incluse',
    en: 'incl. {{rate}} % VAT',
  },
  vatNumber: { de: 'MWST-Nr.', fr: 'N° TVA', en: 'VAT no.' },
  qrMessage: { de: 'Rechnung Nr.', fr: 'Facture n°', en: 'Bill no.' },
} satisfies Record<string, StaticTranslationString>;

const QR_LANGUAGE: Record<Locale, 'DE' | 'FR' | 'EN'> = { de: 'DE', fr: 'FR', en: 'EN' };

/** `CHF 1'274.50` without the currency, for the columns of the table. */
const formatAmount = (amount: number): string => formatChf(amount).replace(/^CHF /, '');

/**
 * Renders a Besuchstag bill: a letter page with the bill's lines, and the Swiss QR bill at its
 * foot, in the language of the registration. The creditor block, the window address and the QR
 * part sit where the camp bill puts them, so both read alike.
 */
export async function renderVisitDayBillPdf(bill: VisitDayBillPdf): Promise<Buffer> {
  const { default: PDFDocument } = await import('pdfkit');
  const { SwissQRBill } = await import('swissqrbill/pdf');
  const { mm2pt } = await import('swissqrbill/utils');
  const t = (key: keyof typeof labels): string => labels[key][bill.locale];

  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const document_ = new PDFDocument({
      autoFirstPage: true,
      size: 'A4',
      margins: { top: 72, left: mm2pt(22), right: mm2pt(22), bottom: mm2pt(10) },
    });
    document_.on('data', (chunk: Buffer) => buffers.push(chunk));
    document_.on('end', () => resolve(Buffer.concat(buffers)));
    document_.on('error', reject);

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Montserrat-ExtraBold.ttf');
    const titleFont = fs.existsSync(fontPath) ? 'Montserrat-ExtraBold' : 'Helvetica-Bold';
    if (titleFont === 'Montserrat-ExtraBold') document_.registerFont(titleFont, fontPath);
    const logoPath = path.join(process.cwd(), 'public', 'logo-conveniat27.png');
    if (fs.existsSync(logoPath)) {
      document_.image(logoPath, mm2pt(148), mm2pt(8), { width: mm2pt(40) });
    }

    const { creditor, debtor } = bill;
    document_.font('Helvetica').fontSize(9).fillColor('black');
    document_.text(
      `${creditor.name}\n${creditor.street} ${creditor.buildingNumber ?? ''}\n${creditor.zip} ${creditor.city}`,
      mm2pt(22),
      mm2pt(45),
      { width: mm2pt(85) },
    );
    const debtorLines = [
      debtor.name,
      debtor.street ?? '',
      [debtor.postalCode, debtor.city]
        .filter((part) => part !== undefined && part !== '')
        .join(' '),
    ].filter((line) => line !== '');
    document_.fontSize(11).text(debtorLines.join('\n'), mm2pt(120), mm2pt(50), {
      width: mm2pt(70),
    });

    document_
      .font(titleFont)
      .fontSize(16)
      .text(bill.title, mm2pt(22), mm2pt(100), {
        width: mm2pt(166),
      });

    const facts: [string, string][] = [
      [t('invoiceNumber'), bill.invoiceNumber],
      [t('registrationNumber'), bill.registrationNumber],
      [t('visitDay'), bill.visitDay],
      [t('issuedOn'), bill.issuedOn],
      [t('dueOn'), bill.dueOn],
    ];
    let y = mm2pt(112);
    document_.font('Helvetica').fontSize(10);
    for (const [label, value] of facts) {
      document_.font('Helvetica-Bold').text(label, mm2pt(22), y, { width: mm2pt(45) });
      document_.font('Helvetica').text(value, mm2pt(70), y, { width: mm2pt(118) });
      y += 14;
    }

    if (bill.letterText.trim() === '') {
      y += 10;
    } else {
      y += 8;
      document_.text(bill.letterText, mm2pt(22), y, { width: mm2pt(166) });
      y = document_.y + 10;
    }

    const columns = { item: 22, quantity: 120, unitPrice: 140, amount: 165 } as const;
    const row = (cells: Record<keyof typeof columns, string>, bold: boolean): void => {
      document_.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      document_.text(cells.item, mm2pt(columns.item), y, { width: mm2pt(96) });
      document_.text(cells.quantity, mm2pt(columns.quantity), y, {
        width: mm2pt(18),
        align: 'right',
      });
      document_.text(cells.unitPrice, mm2pt(columns.unitPrice), y, {
        width: mm2pt(23),
        align: 'right',
      });
      document_.text(cells.amount, mm2pt(columns.amount), y, { width: mm2pt(23), align: 'right' });
      y += 16;
    };
    row(
      { item: t('item'), quantity: t('quantity'), unitPrice: t('unitPrice'), amount: t('amount') },
      true,
    );
    for (const line of bill.lines) {
      row(
        {
          item: line.label,
          quantity: String(line.quantity),
          unitPrice: formatAmount(line.unitPrice),
          amount: formatAmount(line.amount),
        },
        false,
      );
    }
    document_
      .moveTo(mm2pt(22), y - 3)
      .lineTo(mm2pt(188), y - 3)
      .lineWidth(0.5)
      .stroke();
    row(
      { item: t('total'), quantity: '', unitPrice: 'CHF', amount: formatAmount(bill.total) },
      true,
    );
    if (bill.vatRate > 0) {
      row(
        {
          item: t('vatIncluded').replace('{{rate}}', String(bill.vatRate)),
          quantity: '',
          unitPrice: 'CHF',
          amount: formatAmount(bill.vatAmount),
        },
        false,
      );
    }
    if (bill.vatRate > 0 && creditor.uid !== undefined) {
      document_
        .font('Helvetica')
        .fontSize(8)
        .text(`${t('vatNumber')} ${creditor.uid}`, mm2pt(22), y);
    }

    const qrBill = new SwissQRBill(
      {
        currency: 'CHF',
        amount: bill.total,
        reference: bill.reference,
        creditor: {
          name: creditor.name,
          address: creditor.street,
          ...(creditor.buildingNumber === undefined
            ? {}
            : { buildingNumber: creditor.buildingNumber }),
          zip: creditor.zip,
          city: creditor.city,
          account: creditor.account,
          country: creditor.country,
        },
        // A QR bill may leave the payer empty, which the bank's app then fills in; it only
        // prints one when the address is complete.
        ...(debtor.street !== undefined &&
        debtor.street !== '' &&
        debtor.postalCode !== undefined &&
        debtor.postalCode !== '' &&
        debtor.city !== undefined &&
        debtor.city !== ''
          ? {
              debtor: {
                name: debtor.name,
                address: debtor.street,
                zip: debtor.postalCode,
                city: debtor.city,
                country: 'CH',
              },
            }
          : {}),
        additionalInformation: `${t('qrMessage')} ${bill.invoiceNumber}`,
      },
      { language: QR_LANGUAGE[bill.locale], scissors: false, separate: false },
    );
    qrBill.attachTo(document_);
    document_.end();
  });
}
