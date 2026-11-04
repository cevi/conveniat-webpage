import { formatChf } from '@/features/billing-core/money';
import type { VisitDayBill } from '@/features/payload-cms/payload-types';
import { calculateVisitDayBill } from '@/features/visit-day/billing/visit-day-bill-amount';
import {
  reconcileVisitDayBills,
  VISIT_DAY_BILL_COLLECTION,
} from '@/features/visit-day/billing/visit-day-bill-booking';
import { recordVisitDayBillEvent } from '@/features/visit-day/billing/visit-day-bill-events';
import type { SendVisitDayBillInput } from '@/features/visit-day/billing/visit-day-bill-mail';
import {
  findOrStoreIssuePdf,
  SEND_VISIT_DAY_BILL_TASK,
} from '@/features/visit-day/billing/visit-day-bill-mail';
import {
  visitDayBillReference,
  visitDayInvoiceNumber,
} from '@/features/visit-day/billing/visit-day-bill-reference';
import type { PrismaClient } from '@/lib/prisma';
import type { Locale } from '@/types/types';
import type { Payload } from 'payload';

/** Why a bill action was refused, for the admin panel to say. */
export class VisitDayBillActionError extends Error {}

const DAY_MS = 24 * 60 * 60 * 1000;

const localeOf = (bill: Pick<VisitDayBill, 'locale'>): Locale =>
  bill.locale === 'fr' || bill.locale === 'en' ? bill.locale : 'de';

const loadBill = async (payload: Payload, billId: string): Promise<VisitDayBill> => {
  const bill = await payload.findByID({
    collection: VISIT_DAY_BILL_COLLECTION,
    id: billId,
    depth: 0,
    joins: false,
    disableErrors: true,
    overrideAccess: true,
  });
  if (bill === null) throw new VisitDayBillActionError('Diese Rechnung gibt es nicht.');
  return bill;
};

const queueSend = async (payload: Payload, billId: string, actor: string): Promise<void> => {
  await payload.jobs.queue({
    task: SEND_VISIT_DAY_BILL_TASK,
    input: { billId, actor } satisfies SendVisitDayBillInput,
  });
  await payload.update({
    collection: VISIT_DAY_BILL_COLLECTION,
    id: billId,
    overrideAccess: true,
    data: { mailStatus: 'pending' },
  });
};

/** Mails the current bill again, e.g. after a mail that bounced. */
export async function resendVisitDayBill(
  payload: Payload,
  billId: string,
  actor: string,
): Promise<void> {
  const bill = await loadBill(payload, billId);
  if (bill.status === 'cancelled') {
    throw new VisitDayBillActionError('Eine stornierte Rechnung wird nicht mehr verschickt.');
  }
  await queueSend(payload, billId, actor);
}

/**
 * Issues the bill again for the persons it now has, at today's prices: a new bill number issue
 * and a new QR reference. The bill it replaces keeps its reference in `issuedBills`, so a payment
 * on it is still recognised and assigned by hand. Mails the new bill.
 */
export async function reissueVisitDayBill(
  payload: Payload,
  billId: string,
  actor: string,
  options: { persons?: number; reason?: string } = {},
): Promise<VisitDayBill> {
  const bill = await loadBill(payload, billId);
  if (bill.status === 'cancelled') {
    throw new VisitDayBillActionError(
      'Eine stornierte Rechnung kann nicht neu ausgestellt werden.',
    );
  }
  const settings = await payload.findGlobal({
    slug: 'visit-day-bill-settings',
    depth: 0,
    overrideAccess: true,
  });
  const persons = options.persons ?? bill.persons;
  const amount = calculateVisitDayBill(
    { persons, withLunch: bill.withLunch === true },
    {
      withLunch: settings.priceWithLunch,
      withoutLunch: settings.priceWithoutLunch,
      vatRate: settings.vatRate,
    },
    localeOf(bill),
  );
  const issue = bill.issue + 1;
  const issuedAt = new Date();
  const invoiceNumber = visitDayInvoiceNumber(
    settings.invoiceNumberPrefix,
    bill.billNumber,
    issue,
    issuedAt,
  );
  const referenceNumber = visitDayBillReference(bill.billNumber, issue);
  const now = issuedAt.toISOString();

  const updated = await payload.update({
    collection: VISIT_DAY_BILL_COLLECTION,
    id: billId,
    overrideAccess: true,
    depth: 0,
    data: {
      persons,
      issue,
      invoiceNumber,
      // the previous issue's PDF is no longer the bill; the send stores and links the new one
      // eslint-disable-next-line unicorn/no-null -- Payload clears a relationship with null
      pdf: null,
      referenceNumber,
      invoiceAmount: amount.total,
      vatAmount: amount.vatAmount,
      vatRate: amount.vatRate,
      lines: amount.lines,
      issuedAt: now,
      dueDate: new Date(issuedAt.getTime() + settings.paymentDeadlineDays * DAY_MS).toISOString(),
      issuedBills: [
        ...(bill.issuedBills ?? []).map((issued) =>
          issued.supersededAt === null || issued.supersededAt === undefined
            ? { ...issued, supersededAt: now }
            : issued,
        ),
        { invoiceNumber, referenceNumber, amount: amount.total, persons, issuedAt: now },
      ],
    },
  });
  await recordVisitDayBillEvent(payload, {
    bill: billId,
    action: 'issued',
    actor,
    details:
      `${invoiceNumber} über ${formatChf(amount.total)} für ${String(persons)} ` +
      `${persons === 1 ? 'Person' : 'Personen'} ersetzt ` +
      `${bill.invoiceNumber} über ${formatChf(bill.invoiceAmount)}, Referenz ${referenceNumber}` +
      (options.reason === undefined ? '' : `. Grund: ${options.reason}`),
  });
  // what was paid on the earlier bill now counts against the new amount
  await reconcileVisitDayBills(payload, [billId], { actor, verb: 'zugeordnet' });
  // a paid bill is not mailed again, but its new issue still gets its PDF, for finance to see
  await (bill.status === 'paid'
    ? findOrStoreIssuePdf(payload, updated)
    : queueSend(payload, billId, actor));
  return updated;
}

/**
 * Takes persons off a registration, as a visitor asked by email: frees their places, issues the
 * bill again for those who still come, and leaves what was paid beyond it as a refund due.
 *
 * @param keepPersonNumbers which persons of the registration still come, e.g. `[1]`
 */
export async function reduceVisitDayPersons(
  payload: Payload,
  prisma: Pick<PrismaClient, 'visitDayVisitor'>,
  billId: string,
  actor: string,
  { keepPersonNumbers, reason }: { keepPersonNumbers: number[]; reason: string },
): Promise<VisitDayBill> {
  const bill = await loadBill(payload, billId);
  if (bill.status === 'cancelled') {
    throw new VisitDayBillActionError('Die Anmeldung ist storniert.');
  }
  // after an earlier reduction person 2 may be the only one left, so the numbers are read
  // from the persons the bill has, not counted up to its size
  const current =
    (bill.travelPasses ?? []).length > 0
      ? (bill.travelPasses ?? []).map((pass) => pass.personNumber)
      : Array.from({ length: bill.persons }, (_, index) => index + 1);
  const kept = [...new Set(keepPersonNumbers)].filter((number) => current.includes(number));
  if (kept.length === 0) {
    throw new VisitDayBillActionError(
      'Mindestens eine Person muss angemeldet bleiben. Sonst die Anmeldung stornieren.',
    );
  }
  if (kept.length >= bill.persons) {
    throw new VisitDayBillActionError('Es wurde niemand abgemeldet.');
  }
  if (reason.trim() === '') throw new VisitDayBillActionError('Bitte einen Grund angeben.');

  const removed = await prisma.visitDayVisitor.deleteMany({
    where: { registrationId: bill.registrationId, personNumber: { notIn: kept } },
  });
  await recordVisitDayBillEvent(payload, {
    bill: billId,
    action: 'persons_reduced',
    actor,
    details:
      `${String(bill.persons)} → ${String(kept.length)}, bleibt: Person ${kept.join(', ')}, ` +
      `${String(removed.count)} ${removed.count === 1 ? 'Platz' : 'Plätze'} frei. Grund: ${reason.trim()}`,
  });
  await payload.update({
    collection: VISIT_DAY_BILL_COLLECTION,
    id: billId,
    overrideAccess: true,
    data: {
      travelPasses: (bill.travelPasses ?? []).filter((pass) => kept.includes(pass.personNumber)),
    },
  });
  return reissueVisitDayBill(payload, billId, actor, {
    persons: kept.length,
    reason: reason.trim(),
  });
}

/**
 * Cancels a registration: frees all its places and closes its bill. What was paid on it stays
 * booked and reads as a refund due, which finance pays back by hand.
 */
export async function cancelVisitDayBill(
  payload: Payload,
  prisma: Pick<PrismaClient, 'visitDayVisitor'>,
  billId: string,
  actor: string,
  reason: string,
): Promise<void> {
  const bill = await loadBill(payload, billId);
  if (bill.status === 'cancelled') return;
  if (reason.trim() === '') throw new VisitDayBillActionError('Bitte einen Grund angeben.');
  const removed = await prisma.visitDayVisitor.deleteMany({
    where: { registrationId: bill.registrationId },
  });
  await payload.update({
    collection: VISIT_DAY_BILL_COLLECTION,
    id: billId,
    overrideAccess: true,
    data: {
      status: 'cancelled',
      issuedBills: (bill.issuedBills ?? []).map((issued) =>
        issued.supersededAt === null || issued.supersededAt === undefined
          ? { ...issued, supersededAt: new Date().toISOString() }
          : issued,
      ),
    },
  });
  await recordVisitDayBillEvent(payload, {
    bill: billId,
    action: 'cancelled',
    actor,
    details: `${String(removed.count)} ${removed.count === 1 ? 'Platz' : 'Plätze'} frei. Grund: ${reason.trim()}`,
  });
  await reconcileVisitDayBills(payload, [billId], { actor, verb: 'zugeordnet' });
}

/**
 * Marks an open bill paid without a bank payment, e.g. one paid in cash at the office. Keeps
 * why in the history, since no payment will ever explain it.
 */
export async function markVisitDayBillPaid(
  payload: Payload,
  billId: string,
  actor: string,
  note: string,
): Promise<void> {
  const bill = await loadBill(payload, billId);
  if (bill.status !== 'open') {
    throw new VisitDayBillActionError('Nur eine offene Rechnung kann als bezahlt markiert werden.');
  }
  if (note.trim() === '') throw new VisitDayBillActionError('Bitte angeben, wie bezahlt wurde.');
  await payload.update({
    collection: VISIT_DAY_BILL_COLLECTION,
    id: billId,
    overrideAccess: true,
    data: { status: 'paid', paidDate: new Date().toISOString(), paidAmount: bill.invoiceAmount },
  });
  await recordVisitDayBillEvent(payload, {
    bill: billId,
    action: 'marked_paid',
    actor,
    details: `${formatChf(bill.invoiceAmount)}: ${note.trim()}`,
  });
}

/**
 * Mails every bill whose mail failed, e.g. after a bounce wave or a fixed address. A bill still
 * waiting for its job is left alone, so nobody gets their bill twice.
 */
export async function resendFailedVisitDayBills(payload: Payload, actor: string): Promise<number> {
  const { docs } = await payload.find({
    collection: VISIT_DAY_BILL_COLLECTION,
    where: {
      and: [{ status: { not_equals: 'cancelled' } }, { mailStatus: { equals: 'failed' } }],
    },
    pagination: false,
    depth: 0,
    joins: false,
    select: {},
    overrideAccess: true,
  });
  for (const bill of docs) await queueSend(payload, bill.id, actor);
  return docs.length;
}
