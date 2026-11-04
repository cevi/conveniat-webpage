import { readBillPdf } from '@/features/billing-core/bill-pdf-storage';
import { buildCreditorFromSettings } from '@/features/billing-core/creditor';
import { formatChf } from '@/features/billing-core/money';
import { queueBackgroundEmail } from '@/features/payload-cms/payload-cms/utils/email-outbox';
import type {
  OutgoingEmail,
  VisitDayBill,
  VisitDayBillSetting,
} from '@/features/payload-cms/payload-types';
import { renderVisitDayBillPdf } from '@/features/visit-day/billing/render-visit-day-bill-pdf';
import { recordVisitDayBillEvent } from '@/features/visit-day/billing/visit-day-bill-events';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import type { Locale } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';
import type { Payload } from 'payload';

/** The job that renders and mails a Besuchstag bill, outside the request that issued it. */
export const SEND_VISIT_DAY_BILL_TASK = 'sendVisitDayBill';

export interface SendVisitDayBillInput {
  billId: string;
  /** who asked for it, for the history */
  actor: string;
}

const localeOf = (bill: Pick<VisitDayBill, 'locale'>): Locale =>
  bill.locale === 'fr' || bill.locale === 'en' ? bill.locale : 'de';

/** `dd.MM.yyyy`, the way the camp prints a date. */
export const formatSwissDate = (iso: string): string =>
  new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

/** Fills the placeholders of a bill text the settings describe. */
export const fillBillText = (
  template: string,
  bill: Pick<
    VisitDayBill,
    | 'firstName'
    | 'lastName'
    | 'fullName'
    | 'invoiceAmount'
    | 'invoiceNumber'
    | 'registrationNumber'
    | 'visitDate'
    | 'dueDate'
    | 'locale'
  >,
): string => {
  const values: Record<string, string> = {
    firstName: bill.firstName ?? '',
    lastName: bill.lastName ?? '',
    fullName: bill.fullName ?? '',
    amount: formatChf(bill.invoiceAmount),
    invoiceNumber: bill.invoiceNumber,
    registrationNumber: bill.registrationNumber,
    visitDay: formatVisitDay(campClockOf(new Date(bill.visitDate)).dayKey, localeOf(bill)),
    dueDate: formatSwissDate(bill.dueDate),
  };
  return template.replaceAll(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
};

/** The settings in the bill's language; a text left empty in French reads the German one. */
const loadSettings = async (payload: Payload, locale: Locale): Promise<VisitDayBillSetting> =>
  payload.findGlobal({
    slug: 'visit-day-bill-settings',
    locale,
    fallbackLocale: 'de',
    depth: 0,
    overrideAccess: true,
  });

/** Renders the current bill of a registration as it is stored. */
export const renderStoredVisitDayBill = async (
  payload: Payload,
  bill: VisitDayBill,
): Promise<Buffer> => {
  const locale = localeOf(bill);
  const settings = await loadSettings(payload, locale);
  const campSettings = await payload.findGlobal({
    slug: 'bill-settings',
    depth: 0,
    overrideAccess: true,
  });
  return renderVisitDayBillPdf({
    locale,
    creditor: buildCreditorFromSettings(campSettings),
    debtor: {
      name: bill.fullName ?? '',
      ...(typeof bill.street === 'string' ? { street: bill.street } : {}),
      ...(typeof bill.postalCode === 'string' ? { postalCode: bill.postalCode } : {}),
      ...(typeof bill.city === 'string' ? { city: bill.city } : {}),
    },
    title: settings.documentTitle,
    letterText: fillBillText(settings.letterText ?? '', bill),
    invoiceNumber: bill.invoiceNumber,
    registrationNumber: bill.registrationNumber,
    reference: bill.referenceNumber,
    visitDay: formatSwissDate(bill.visitDate),
    issuedOn: formatSwissDate(bill.issuedAt),
    dueOn: formatSwissDate(bill.dueDate),
    lines: (bill.lines ?? []).map((line) => ({
      label: line.label,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: line.amount,
    })),
    total: bill.invoiceAmount,
    vatAmount: bill.vatAmount ?? 0,
    vatRate: bill.vatRate ?? 0,
  });
};

/**
 * The name the PDF of one issue is stored under. Payload gives a second file of the same name a
 * number, and bumps a number the name already ends in: `…-BT2027-0004.pdf` would become
 * `…-BT2027-5.pdf`, the name of another bill. Ending in a word, it becomes `…-rechnung-1.pdf`.
 */
export const storedPdfName = (invoiceNumber: string): string =>
  `besuchstag-${invoiceNumber}-rechnung.pdf`;

/**
 * Links the stored PDF to the bill and to the entry of `issuedBills` for its issue. Each write
 * applies only while the bill is still at that issue: issued again in the meantime, it waits for
 * its own PDF rather than showing this one. Written on the collection, in place, because the
 * bill may have changed while the PDF rendered; the bills have no hooks and no versions.
 */
const linkIssuePdf = async (
  payload: Payload,
  bill: Pick<VisitDayBill, 'id' | 'invoiceNumber'>,
  pdfId: string,
): Promise<void> => {
  const bills = payload.db.collections['visit-day-bills'];
  if (bills === undefined) throw new Error('The Besuchstag bills have no database collection.');
  const current = { _id: bill.id, invoiceNumber: bill.invoiceNumber };
  const linked = await bills.updateOne(current, { $set: { pdf: pdfId, updatedAt: new Date() } });
  await bills.updateOne(
    { ...current, 'issuedBills.invoiceNumber': bill.invoiceNumber },
    { $set: { 'issuedBills.$.pdf': pdfId } },
  );
  if (linked.matchedCount === 0) {
    payload.logger.info(
      `Besuchstag bill ${bill.id} was issued again while ${bill.invoiceNumber} rendered; its PDF stays unlinked.`,
    );
  }
};

/**
 * The PDF of the bill as it stands, stored once per issue. A resend mails the stored file, so
 * the payer gets exactly what finance keeps; a changed address or text needs a new issue.
 *
 * The file is found by its name, not by the link on the bill, so a send that stored it and then
 * failed finds it again, and links it this time.
 */
export const findOrStoreIssuePdf = async (
  payload: Payload,
  bill: VisitDayBill,
): Promise<Buffer> => {
  const filename = storedPdfName(bill.invoiceNumber);
  const { docs } = await payload.find({
    collection: 'bill-pdfs',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const existing = docs[0];
  if (existing !== undefined) {
    const pdf = await readBillPdf(filename);
    await linkIssuePdf(payload, bill, existing.id);
    return pdf;
  }

  const pdf = await renderStoredVisitDayBill(payload, bill);
  const stored = await payload.create({
    collection: 'bill-pdfs',
    data: {},
    file: { data: pdf, name: filename, mimetype: 'application/pdf', size: pdf.length },
    overrideAccess: true,
  });
  await linkIssuePdf(payload, bill, stored.id);
  return pdf;
};

/**
 * Renders a bill, keeps the PDF with it, and puts the mail with the PDF into the outbox.
 *
 * Runs as a job, so the registration does not wait for the PDF. A bill without an email
 * address is left as it is and recorded as failed, for finance to send by hand.
 */
export async function sendVisitDayBill(
  payload: Payload,
  { billId, actor }: SendVisitDayBillInput,
): Promise<void> {
  const bill = await payload.findByID({
    collection: 'visit-day-bills',
    id: billId,
    depth: 0,
    overrideAccess: true,
  });
  if (bill.status === 'cancelled') return;

  const email = bill.email ?? '';
  if (email === '') {
    await payload.update({
      collection: 'visit-day-bills',
      id: billId,
      overrideAccess: true,
      data: { mailStatus: 'failed' },
    });
    await recordVisitDayBillEvent(payload, {
      bill: billId,
      action: 'mail_failed',
      actor,
      details: 'Die Anmeldung hat keine E-Mail-Adresse.',
    });
    return;
  }

  const pdf = await findOrStoreIssuePdf(payload, bill);

  const settings = await loadSettings(payload, localeOf(bill));
  const queued = await queueBackgroundEmail(payload, {
    to: email,
    subject: fillBillText(settings.emailSubject, bill),
    text: fillBillText(settings.emailBody, bill),
    attachments: [
      {
        filename: `besuchstag-${bill.invoiceNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
    visitDayBill: billId,
  });

  await payload.update({
    collection: 'visit-day-bills',
    id: billId,
    overrideAccess: true,
    data: { mailStatus: 'queued' },
  });
  await recordVisitDayBillEvent(payload, {
    bill: billId,
    action: 'mail_queued',
    actor,
    details: `${bill.invoiceNumber} an ${email} (E-Mail ${queued.outgoingEmailId})`,
  });
  payload.logger.info(`Besuchstag bill ${bill.invoiceNumber} queued for ${billId}.`);
}

/**
 * Follows a bill mail's delivery: `success` marks the bill mailed, `error` marks it failed, so
 * the list shows which bills still have to reach their payer. Called by the outbox.
 */
export async function recordVisitDayBillMail(
  payload: Payload,
  billId: string,
  email: Pick<OutgoingEmail, 'id' | 'to' | 'deliveryStatus'>,
): Promise<void> {
  const sent = email.deliveryStatus === 'success';
  await payload.update({
    collection: 'visit-day-bills',
    id: billId,
    overrideAccess: true,
    data: { mailStatus: sent ? 'sent' : 'failed' },
  });
  await recordVisitDayBillEvent(payload, {
    bill: billId,
    action: sent ? 'mail_sent' : 'mail_failed',
    actor: 'E-Mail-Versand',
    details: `an ${email.to} (E-Mail ${email.id})`,
  });
}
