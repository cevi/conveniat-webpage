import { PAID } from '@/features/billing/services/billing-status';
import { describeActor } from '@/features/billing/services/describe-actor';
import {
  allocatedParticipantIds,
  allocatedToParticipant,
  describeAllocationProblem,
  totalAllocatedTo,
} from '@/features/billing/services/payment-allocation';
import {
  findPaymentsAllocatedTo,
  queuePaymentWriteBack,
  reconcileParticipantPayments,
} from '@/features/billing/services/payment-booking';
import { formatChf, toRappen } from '@/features/billing/services/payment-matching';
import type { BillPayment } from '@/features/payload-cms/payload-types';
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

/**
 * Refuses allocations that do not add up, and any change that would leave a paid bill short.
 *
 * A paid bill is definitiv in the Cevi.DB and nothing turns that back, so a payment can only
 * leave a paid bill once another one pays it. The nested reads leave `req` out on purpose:
 * passing it with an `internal` context would grant that context to the rest of the request.
 */
export const validatePaymentChange: CollectionBeforeChangeHook<BillPayment> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const refundedDate = 'refundedDate' in data ? data.refundedDate : originalDoc?.refundedDate;
  const next: Pick<BillPayment, 'amount' | 'allocations' | 'refundedDate'> = {
    amount: data.amount ?? originalDoc?.amount ?? 0,
    allocations: data.allocations ?? originalDoc?.allocations ?? [],
    ...(refundedDate === undefined ? {} : { refundedDate }),
  };
  const problem = describeAllocationProblem(next);
  if (problem !== undefined) throw new APIError(problem, 400, undefined, true);
  if (operation !== 'update' || originalDoc === undefined) return data;

  const affected = new Set([
    ...allocatedParticipantIds(originalDoc),
    ...allocatedParticipantIds(next),
  ]);
  for (const participantId of affected) {
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
    const remaining =
      totalAllocatedTo(others, participantId) + allocatedToParticipant(next, participantId);
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
  return data;
};

/**
 * Books the bills a changed allocation now pays, and flags or clears their double payment.
 *
 * The payment import reconciles every bill of a file in one go and skips this.
 */
export const reconcileAfterPaymentChange: CollectionAfterChangeHook<BillPayment> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context['paymentImport'] === true) return doc;

  const affected = new Set([
    ...allocatedParticipantIds(previousDoc),
    ...allocatedParticipantIds(doc),
  ]);
  if (affected.size === 0) return doc;

  const result = await reconcileParticipantPayments(
    req.payload,
    affected,
    { actor: describeActor(req.user), verb: 'zugeordnet' },
    [doc],
  );
  for (const error of result.errors) {
    req.payload.logger.warn(`Payment ${doc.transactionReference}: ${error}`);
  }
  await queuePaymentWriteBack(req.payload, result.bookedIds);
  return doc;
};
