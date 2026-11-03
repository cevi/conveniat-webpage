import type { BillKind } from '@/features/billing-core/bill-kind';
import { describeActor } from '@/features/billing-core/describe-actor';
import { formatChf, toRappen } from '@/features/billing-core/money';
import { allocatedTo, totalAllocatedTo } from '@/features/billing-core/payment-allocation';
import {
  findPaymentsForVisitDayBills,
  reconcileVisitDayBills,
  VISIT_DAY_BILL_COLLECTION,
} from '@/features/visit-day/billing/visit-day-bill-booking';
import { APIError } from 'payload';

/**
 * The Besuchstag bills, as the payment ledger sees them. A paid bill keeps its booking: a
 * payment can only leave it once another one pays it, as for the camp bills, so a ticket marked
 * valid does not turn invalid behind the visitor's back.
 */
export const visitDayBillKind: BillKind = {
  collection: VISIT_DAY_BILL_COLLECTION,
  label: { de: 'Besuchstag', en: 'Visiting day', fr: 'Journée des visites' },

  validatePaymentChange: async ({ req, originalDoc, next, billIds }) => {
    for (const billId of billIds) {
      const bill = await req.payload.findByID({
        collection: VISIT_DAY_BILL_COLLECTION,
        id: billId,
        depth: 0,
        joins: false,
        disableErrors: true,
        overrideAccess: true,
      });
      // a bill marked paid by hand has no payment to keep
      const transaction = bill?.paymentTransactionReference ?? '';
      if (bill?.status !== 'paid' || transaction === '') continue;
      const payments = await findPaymentsForVisitDayBills(req.payload, [billId]);
      const others = payments.filter((payment) => payment.id !== originalDoc.id);
      const remaining = totalAllocatedTo(others, billId) + allocatedTo(next, billId);
      if (remaining < toRappen(bill.invoiceAmount)) {
        throw new APIError(
          `Die Besuchstag-Rechnung ${bill.registrationNumber} ist bereits als bezahlt verbucht. ` +
            `Ohne diese Zahlung wären nur ${formatChf(remaining / 100)} von ` +
            `${formatChf(bill.invoiceAmount)} bezahlt. Bitte zuerst eine andere Zahlung zuordnen.`,
          400,
          undefined,
          true,
        );
      }
    }
  },

  reconcileAfterPaymentChange: async ({ payload, user, doc, billIds }) => {
    const result = await reconcileVisitDayBills(
      payload,
      billIds,
      { actor: describeActor(user), verb: 'zugeordnet' },
      [doc],
    );
    for (const error of result.errors) {
      payload.logger.warn(`Payment ${doc.transactionReference}: ${error}`);
    }
  },
};
