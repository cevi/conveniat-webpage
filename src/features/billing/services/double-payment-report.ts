import { toRappen } from '@/features/billing-core/money';
import {
  allocatedToParticipant,
  isRefunded,
  paymentsCountingFor,
  relationId,
  totalAllocatedTo,
} from '@/features/billing-core/payment-allocation';
import {
  DOUBLE_PAYMENT_DETECTED_ACTION,
  DOUBLE_PAYMENT_RESOLVED_ACTION,
  findPaymentsAllocatedTo,
} from '@/features/billing/services/payment-booking';
import { renderDoublePaymentReportPdf } from '@/features/billing/services/render-double-payment-report';
import type { BillParticipant, BillPayment } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/**
 * The bills paid more than once, as the finance mail attaches them and the admin panel
 * downloads them: one document, so what an operator downloads is what the mail sent.
 */

export interface DoublePaymentReportPayment {
  transactionReference: string;
  bookingDate?: string | undefined;
  payer: string;
  /** What this payment gives the bill, which for a split payment is less than it was. */
  amount: number;
}

export interface DoublePaymentReportEntry {
  fullName: string;
  invoiceNumber: string;
  eventName: string;
  invoiceAmount: number;
  paid: number;
  /** What has to go back or on to another bill. */
  excess: number;
  payments: DoublePaymentReportPayment[];
}

/** Another bill a payment was moved to, in part or in whole. */
export interface ReassignedShare {
  fullName: string;
  invoiceNumber: string;
  amount: number;
}

/** A payment that once paid a bill twice, and where its money is now. */
export interface ResolvedDoublePaymentPayment {
  transactionReference: string;
  bookingDate?: string | undefined;
  payer: string;
  amount: number;
  /** What still counts for the bill that was paid twice. */
  countsHere: number;
  elsewhere: ReassignedShare[];
  refundedDate?: string | undefined;
}

/** A bill that was paid twice and no longer is. */
export interface ResolvedDoublePaymentEntry {
  fullName: string;
  invoiceNumber: string;
  eventName: string;
  invoiceAmount: number;
  detectedAt?: string | undefined;
  resolvedAt: string;
  /** Who resolved it and how, as the bill's history says: `zugeordnet von …`. */
  resolvedBy: string;
  payments: ResolvedDoublePaymentPayment[];
}

export interface DoublePaymentReport {
  generatedAt: Date;
  entries: DoublePaymentReportEntry[];
  totalExcess: number;
  /** Kept in the report so the weekly mail still says what happened once the flag is gone. */
  resolved: ResolvedDoublePaymentEntry[];
}

interface DoublePaymentHistoryEntry {
  date: string;
  action: string;
  value?: string;
}

type ReportParticipant = Pick<
  BillParticipant,
  'id' | 'fullName' | 'invoiceNumber' | 'invoiceAmount' | 'eventName'
>;

const doublePaymentHistory = (syncHistory: unknown): DoublePaymentHistoryEntry[] =>
  Array.isArray(syncHistory)
    ? syncHistory.flatMap((entry: unknown) => {
        if (entry === null || typeof entry !== 'object') return [];
        const { date, action, value } = entry as Record<string, unknown>;
        if (typeof date !== 'string' || typeof action !== 'string') return [];
        if (
          action !== DOUBLE_PAYMENT_DETECTED_ACTION &&
          action !== DOUBLE_PAYMENT_RESOLVED_ACTION
        ) {
          return [];
        }
        return [{ date, action, ...(typeof value === 'string' ? { value } : {}) }];
      })
    : [];

/** Lays the flagged bills out with the payments that count for them, largest excess first. */
export function buildDoublePaymentReport(
  participants: ReportParticipant[],
  payments: BillPayment[],
  generatedAt: Date,
  resolved: ResolvedDoublePaymentEntry[] = [],
): DoublePaymentReport {
  const entries = participants
    .map((participant): DoublePaymentReportEntry => {
      const allocated = totalAllocatedTo(payments, participant.id);
      const invoiceAmount = participant.invoiceAmount ?? 0;
      return {
        fullName: participant.fullName,
        invoiceNumber: participant.invoiceNumber ?? '–',
        eventName: participant.eventName ?? '',
        invoiceAmount,
        paid: allocated / 100,
        excess: (allocated - toRappen(invoiceAmount)) / 100,
        payments: paymentsCountingFor(payments, participant.id).map((payment) => ({
          transactionReference: payment.transactionReference,
          bookingDate: payment.bookingDate ?? undefined,
          payer: payment.payer ?? '',
          amount: allocatedToParticipant(payment, participant.id) / 100,
        })),
      };
    })
    .filter((entry) => entry.excess > 0)
    .toSorted((a, b) =>
      b.excess === a.excess ? a.fullName.localeCompare(b.fullName, 'de-CH') : b.excess - a.excess,
    );

  return {
    generatedAt,
    entries,
    totalExcess: entries.reduce((sum, entry) => sum + toRappen(entry.excess), 0) / 100,
    resolved,
  };
}

/**
 * Lays out the bills whose double payment was resolved, latest first, with what became of
 * each payment involved.
 *
 * The flag only says what is open now. What was resolved is read from the bill's history and
 * from the payments themselves: a payment keeps the bill its reference named after it is
 * moved on, so the one that paid twice is still found once it counts elsewhere.
 *
 * @param others the bills a payment was moved to, to name them
 */
export function buildResolvedDoublePayments(
  participants: (ReportParticipant & Pick<BillParticipant, 'doublePayment' | 'syncHistory'>)[],
  payments: BillPayment[],
  others: Pick<BillParticipant, 'id' | 'fullName' | 'invoiceNumber'>[],
): ResolvedDoublePaymentEntry[] {
  const othersById = new Map(others.map((other) => [other.id, other]));

  return participants
    .flatMap((participant): ResolvedDoublePaymentEntry[] => {
      // A bill flagged again is listed among the open ones, with its current payments.
      if (participant.doublePayment === true) return [];
      const history = doublePaymentHistory(participant.syncHistory);
      const resolvedIndex = history.findLastIndex(
        (entry) => entry.action === DOUBLE_PAYMENT_RESOLVED_ACTION,
      );
      const resolvedEntry = history[resolvedIndex];
      if (resolvedEntry === undefined) return [];
      const detected = history
        .slice(0, resolvedIndex)
        .findLast((entry) => entry.action === DOUBLE_PAYMENT_DETECTED_ACTION);

      const involved = payments
        .filter(
          (payment) =>
            relationId(payment.matchedParticipant) === participant.id ||
            (payment.allocations ?? []).some(
              (allocation) => relationId(allocation.participant) === participant.id,
            ),
        )
        .toSorted((a, b) => (a.bookingDate ?? '').localeCompare(b.bookingDate ?? ''));

      return [
        {
          fullName: participant.fullName,
          invoiceNumber: participant.invoiceNumber ?? '–',
          eventName: participant.eventName ?? '',
          invoiceAmount: participant.invoiceAmount ?? 0,
          detectedAt: detected?.date,
          resolvedAt: resolvedEntry.date,
          resolvedBy: resolvedEntry.value ?? '',
          payments: involved.map((payment) => ({
            transactionReference: payment.transactionReference,
            bookingDate: payment.bookingDate ?? undefined,
            payer: payment.payer ?? '',
            amount: payment.amount,
            countsHere: allocatedToParticipant(payment, participant.id) / 100,
            elsewhere: isRefunded(payment)
              ? []
              : (payment.allocations ?? []).flatMap((allocation): ReassignedShare[] => {
                  const id = relationId(allocation.participant);
                  if (id === undefined || id === participant.id) return [];
                  const other = othersById.get(id);
                  return [
                    {
                      fullName: other?.fullName ?? 'Unbekannte Anmeldung',
                      invoiceNumber: other?.invoiceNumber ?? '–',
                      amount: allocation.amount,
                    },
                  ];
                }),
            refundedDate: isRefunded(payment) ? (payment.refundedDate ?? undefined) : undefined,
          })),
        },
      ];
    })
    .toSorted((a, b) => b.resolvedAt.localeCompare(a.resolvedAt));
}

/** Loads every bill flagged as paid twice, and every one that was, with their payments. */
export async function findDoublePaymentReport(
  payload: Payload,
  now: Date,
): Promise<DoublePaymentReport> {
  const participants = await payload.find({
    collection: 'bill-participants',
    where: { doublePayment: { equals: true } },
    pagination: false,
    depth: 0,
    joins: false,
    context: { internal: true },
  });
  const payments = await findPaymentsAllocatedTo(
    payload,
    participants.docs.map((participant) => participant.id),
  );

  // `in: []` matches nothing, so a week without a resolved bill costs two empty reads.
  const { docs: resolved } = await payload.find({
    collection: 'bill-participants',
    where: {
      'syncHistory.action': { equals: DOUBLE_PAYMENT_RESOLVED_ACTION },
      doublePayment: { not_equals: true },
    },
    pagination: false,
    depth: 0,
    joins: false,
    context: { internal: true },
  });
  const resolvedIds = resolved.map((participant) => participant.id);
  // The payment that was moved on no longer points at the bill through its allocations,
  // only through the reference it came with.
  const { docs: resolvedPayments } = await payload.find({
    collection: 'bill-payments',
    where: {
      or: [
        { 'allocations.participant': { in: resolvedIds } },
        { matchedParticipant: { in: resolvedIds } },
      ],
    },
    pagination: false,
    depth: 0,
    context: { internal: true },
  });
  const { docs: others } = await payload.find({
    collection: 'bill-participants',
    where: {
      id: {
        in: resolvedPayments
          .flatMap((payment) => payment.allocations ?? [])
          .map((allocation) => relationId(allocation.participant))
          .filter((id) => id !== undefined && !resolvedIds.includes(id)),
      },
    },
    select: { fullName: true, invoiceNumber: true },
    pagination: false,
    depth: 0,
    joins: false,
    context: { internal: true },
  });

  return buildDoublePaymentReport(
    participants.docs,
    payments,
    now,
    buildResolvedDoublePayments(resolved, resolvedPayments, [...resolved, ...others]),
  );
}

/** Renders the report and names the file the way the finance mail attaches it. */
export async function buildDoublePaymentAttachment(
  report: DoublePaymentReport,
): Promise<{ filename: string; content: Buffer }> {
  return {
    filename: `doppelzahlungen-${report.generatedAt.toISOString().slice(0, 10)}.pdf`,
    content: await renderDoublePaymentReportPdf(report),
  };
}
