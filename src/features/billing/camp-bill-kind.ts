import type { BillKind } from '@/features/billing-core/bill-kind';
import { describeActor } from '@/features/billing-core/describe-actor';
import { formatChf, toRappen } from '@/features/billing-core/money';
import {
  allocatedTo,
  CAMP_BILL_COLLECTION,
  totalAllocatedTo,
} from '@/features/billing-core/payment-allocation';
import { PAID } from '@/features/billing/services/billing-status';
import {
  findPaymentsAllocatedTo,
  queuePaymentWriteBack,
  reconcileParticipantPayments,
} from '@/features/billing/services/payment-booking';
import { APIError } from 'payload';

/**
 * The camp bills, issued from the Cevi.DB, as the payment ledger sees them.
 *
 * A paid camp bill is definitiv in the Cevi.DB and nothing turns that back, so a payment can
 * only leave a paid bill once another one pays it. The nested reads leave `req` out on purpose:
 * passing it with an `internal` context would grant that context to the rest of the request.
 */
export const campBillKind: BillKind = {
  collection: CAMP_BILL_COLLECTION,
  label: { de: 'Lager', en: 'Camp', fr: 'Camp' },

  validatePaymentChange: async ({ req, originalDoc, next, billIds }) => {
    for (const participantId of billIds) {
      const participant = await req.payload.findByID({
        collection: 'bill-participants',
        id: participantId,
        depth: 0,
        joins: false,
        disableErrors: true,
        context: { internal: true },
      });
      if (participant?.status !== PAID) continue;
      const invoiceAmount = participant.invoiceAmount;
      if (invoiceAmount === null || invoiceAmount === undefined) continue;

      const allocatedPayments = await findPaymentsAllocatedTo(req.payload, [participantId]);
      const others = allocatedPayments.filter((payment) => payment.id !== originalDoc.id);
      const remaining = totalAllocatedTo(others, participantId) + allocatedTo(next, participantId);
      if (remaining < toRappen(invoiceAmount)) {
        throw new APIError(
          `${participant.fullName} ist bereits als bezahlt verbucht. Ohne diese Zahlung wären nur ` +
            `${formatChf(remaining / 100)} von ${formatChf(invoiceAmount)} bezahlt. ` +
            'Bitte zuerst eine andere Zahlung dieser Rechnung zuordnen.',
          400,
          undefined,
          true,
        );
      }
    }
  },

  /** Books the bills a changed allocation now pays, and flags or clears their double payment. */
  reconcileAfterPaymentChange: async ({ payload, user, doc, billIds }) => {
    const result = await reconcileParticipantPayments(
      payload,
      billIds,
      { actor: describeActor(user), verb: 'zugeordnet' },
      [doc],
    );
    for (const error of result.errors) {
      payload.logger.warn(`Payment ${doc.transactionReference}: ${error}`);
    }
    await queuePaymentWriteBack(payload, result.bookedIds);
  },
};
