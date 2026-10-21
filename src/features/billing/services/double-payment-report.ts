import {
  allocatedToParticipant,
  paymentsCountingFor,
  totalAllocatedTo,
} from '@/features/billing/services/payment-allocation';
import { toRappen } from '@/features/billing/services/payment-matching';
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

export interface DoublePaymentReport {
  generatedAt: Date;
  entries: DoublePaymentReportEntry[];
  totalExcess: number;
}

/** Lays the flagged bills out with the payments that count for them, largest excess first. */
export function buildDoublePaymentReport(
  participants: Pick<
    BillParticipant,
    'id' | 'fullName' | 'invoiceNumber' | 'invoiceAmount' | 'eventName'
  >[],
  payments: BillPayment[],
  generatedAt: Date,
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
  };
}

/** Loads every bill flagged as paid twice, with its payments. */
export async function findDoublePaymentReport(
  payload: Payload,
  now: Date,
): Promise<DoublePaymentReport> {
  const participants = await payload.find({
    collection: 'bill-participants',
    where: { doublePayment: { equals: true } },
    pagination: false,
    depth: 0,
    context: { internal: true },
  });
  const ids = participants.docs.map((participant) => participant.id);
  if (ids.length === 0) return buildDoublePaymentReport([], [], now);
  const payments = await payload.find({
    collection: 'bill-payments',
    where: { 'allocations.participant': { in: ids } },
    pagination: false,
    depth: 0,
    context: { internal: true },
  });
  return buildDoublePaymentReport(participants.docs, payments.docs, now);
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
