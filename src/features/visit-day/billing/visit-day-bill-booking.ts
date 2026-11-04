import { formatChf, OVERPAYMENT_TOLERANCE, toRappen } from '@/features/billing-core/money';
import {
  allocatedBillIds,
  paymentsCountingFor,
  settlingPayments,
  totalAllocatedTo,
} from '@/features/billing-core/payment-allocation';
import type { BillPayment, VisitDayBill } from '@/features/payload-cms/payload-types';
import type { VisitDayBillEventAction } from '@/features/visit-day/billing/visit-day-bill-events';
import { recordVisitDayBillEvent } from '@/features/visit-day/billing/visit-day-bill-events';
import type { Payload } from 'payload';

export const VISIT_DAY_BILL_COLLECTION = 'visit-day-bills';

/** Who changed the payments, and how, for the bill's history. */
export interface VisitDayBookingSource {
  actor: string;
  verb: 'importiert' | 'zugeordnet';
}

/** Every payment allocated to any of these Besuchstag bills, refunded or not. */
export async function findPaymentsForVisitDayBills(
  payload: Payload,
  billIds: string[],
): Promise<BillPayment[]> {
  if (billIds.length === 0) return [];
  const found = await payload.find({
    collection: 'bill-payments',
    where: { 'allocations.bill.value': { in: billIds } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  return found.docs;
}

/**
 * How much was paid on a bill beyond its amount, in CHF, once that is more than the rounding the
 * import accepts. Two payments, or a bill reduced after it was paid, both read as money to give
 * back.
 */
export const refundDueOn = (allocatedRappen: number, invoiceAmount: number): number => {
  const overpaid = allocatedRappen - toRappen(invoiceAmount);
  return overpaid > toRappen(OVERPAYMENT_TOLERANCE) ? overpaid / 100 : 0;
};

/**
 * Brings Besuchstag bills in line with the payments allocated to them: books an open bill its
 * payments now pay, and flags what was paid beyond it as a refund. Like the camp bills, a paid
 * bill is not unbooked here; the ledger refuses a change that would leave it short.
 *
 * @param justSaved payments written in this request, used in place of what a read returns
 * @returns the bills this run booked as paid
 */
export async function reconcileVisitDayBills(
  payload: Payload,
  billIds: Iterable<string>,
  source: VisitDayBookingSource,
  justSaved: BillPayment[] = [],
): Promise<{ bookedIds: string[]; errors: string[] }> {
  const ids = [...new Set(billIds)];
  const result = { bookedIds: [] as string[], errors: [] as string[] };
  if (ids.length === 0) return result;

  const bills = await payload.find({
    collection: VISIT_DAY_BILL_COLLECTION,
    where: { id: { in: ids } },
    pagination: false,
    depth: 0,
    joins: false,
    overrideAccess: true,
  });
  const paymentsById = new Map<string, BillPayment>();
  for (const payment of [...(await findPaymentsForVisitDayBills(payload, ids)), ...justSaved]) {
    paymentsById.set(payment.id, payment);
  }
  const payments = [...paymentsById.values()];

  for (const bill of bills.docs) {
    const mine = payments.filter((payment) =>
      allocatedBillIds(payment, VISIT_DAY_BILL_COLLECTION).includes(bill.id),
    );
    const counting = paymentsCountingFor(mine, bill.id);
    const allocated = totalAllocatedTo(mine, bill.id);
    const data: Partial<VisitDayBill> = {};
    const events: { action: VisitDayBillEventAction; details: string }[] = [];

    if (bill.status === 'open') {
      const settling = settlingPayments(counting, bill.id, toRappen(bill.invoiceAmount));
      const first = settling.at(0);
      const last = settling.at(-1);
      if (first !== undefined && last !== undefined) {
        const settled = totalAllocatedTo(settling, bill.id);
        data.status = 'paid';
        data.paidDate = last.bookingDate ?? new Date().toISOString();
        data.paidAmount = settled / 100;
        data.paymentTransactionReference = first.transactionReference;
        events.push({
          action: 'payment_booked',
          details:
            `${formatChf(settled / 100)} für ${formatChf(bill.invoiceAmount)}, ` +
            `Transaktion ${settling.map((payment) => payment.transactionReference).join(', ')}, ` +
            `${source.verb} von ${source.actor}`,
        });
      }
    }

    const refund =
      bill.status === 'cancelled' ? allocated / 100 : refundDueOn(allocated, bill.invoiceAmount);
    if (refund !== (bill.refundDue ?? 0)) {
      data.refundDue = refund;
      data.doublePayment = refund > 0;
      const received =
        bill.status === 'cancelled'
          ? `${formatChf(allocated / 100)} erhalten für die stornierte Anmeldung`
          : `${formatChf(allocated / 100)} erhalten für ${formatChf(bill.invoiceAmount)}`;
      events.push(
        refund > 0
          ? {
              action: 'refund_due',
              details:
                `${received}, ${formatChf(refund)} zurückzuerstatten, Transaktionen ` +
                counting.map((payment) => payment.transactionReference).join(', '),
            }
          : {
              action: 'double_payment_resolved',
              details: `${source.verb} von ${source.actor}`,
            },
      );
    }

    if (Object.keys(data).length === 0) continue;
    try {
      await payload.update({
        collection: VISIT_DAY_BILL_COLLECTION,
        id: bill.id,
        depth: 0,
        overrideAccess: true,
        data,
      });
      for (const event of events) {
        await recordVisitDayBillEvent(payload, { bill: bill.id, actor: source.actor, ...event });
      }
      if (data.status === 'paid') result.bookedIds.push(bill.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      payload.logger.warn(`Could not book Besuchstag bill ${bill.id}: ${reason}`);
      result.errors.push(`${bill.registrationNumber}: konnte nicht verbucht werden – ${reason}`);
    }
  }
  return result;
}
