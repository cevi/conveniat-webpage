import type { VisitDayBill } from '@/features/payload-cms/payload-types';
import { calculateVisitDayBill } from '@/features/visit-day/billing/visit-day-bill-amount';
import { renderStoredVisitDayBill } from '@/features/visit-day/billing/visit-day-bill-mail';
import {
  visitDayBillReference,
  visitDayInvoiceNumber,
} from '@/features/visit-day/billing/visit-day-bill-reference';
import { loadVisitDaySettings, toDatabaseDate } from '@/features/visit-day/visit-day-settings';
import type { Locale } from '@/types/types';
import type { Payload } from 'payload';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The day the preview visits when no Besuchstag is set up yet. */
const FALLBACK_DAY = '2027-07-28';

/**
 * A bill for a registration that does not exist: two persons with lunch on the first Besuchstag,
 * priced and worded by the saved settings, as the bill would be issued today.
 */
export const buildPreviewBill = (
  settings: {
    priceWithLunch: number;
    priceWithoutLunch: number;
    vatRate: number;
    invoiceNumberPrefix: string;
    paymentDeadlineDays: number;
  },
  day: string,
  locale: Locale,
  now: Date,
): VisitDayBill => {
  const amount = calculateVisitDayBill(
    { persons: 2, withLunch: true },
    {
      withLunch: settings.priceWithLunch,
      withoutLunch: settings.priceWithoutLunch,
      vatRate: settings.vatRate,
    },
    locale,
  );
  return {
    id: 'preview',
    status: 'open',
    mailStatus: 'pending',
    registrationNumber: '991001-B001',
    registrationId: 'preview',
    billNumber: 1,
    visitDate: toDatabaseDate(day).toISOString(),
    persons: 2,
    withLunch: true,
    locale,
    firstName: 'Maximilian',
    lastName: 'Muster',
    fullName: 'Maximilian Muster',
    street: 'Seestrasse 12',
    postalCode: '8610',
    city: 'Uster',
    invoiceNumber: visitDayInvoiceNumber(settings.invoiceNumberPrefix, 1, 1, now),
    referenceNumber: visitDayBillReference(1, 1),
    issue: 1,
    invoiceAmount: amount.total,
    vatAmount: amount.vatAmount,
    vatRate: amount.vatRate,
    issuedAt: now.toISOString(),
    dueDate: new Date(now.getTime() + settings.paymentDeadlineDays * DAY_MS).toISOString(),
    lines: amount.lines,
    updatedAt: now.toISOString(),
    createdAt: now.toISOString(),
  } as VisitDayBill;
};

/** Renders the preview bill in one language, through the same path as a real one. */
export async function renderVisitDayBillPreview(
  payload: Payload,
  locale: Locale,
  now: Date = new Date(),
): Promise<Buffer> {
  const settings = await payload.findGlobal({
    slug: 'visit-day-bill-settings',
    depth: 0,
    overrideAccess: true,
  });
  const visitDays = await loadVisitDaySettings(payload);
  const days = visitDays.days.map((day) => day.date).toSorted((a, b) => a.localeCompare(b));
  return renderStoredVisitDayBill(
    payload,
    buildPreviewBill(settings, days[0] ?? FALLBACK_DAY, locale, now),
  );
}
