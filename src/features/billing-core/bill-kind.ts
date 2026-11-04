import type { BillPayment } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import type { CollectionSlug, Payload, PayloadRequest } from 'payload';

/** A payment as an allocation change would leave it. */
export type PaymentAfterChange = Pick<BillPayment, 'amount' | 'allocations' | 'refundedDate'>;

/**
 * One kind of bill paid into the shared QR-IBAN: the camp bills, issued from the Cevi.DB, or the
 * Besuchstag bills. The payment ledger and the bank import know bills only through this, so
 * neither imports the feature that issues them.
 */
export interface BillKind {
  /** the collection its bills live in, which a payment's `bill` points to */
  collection: CollectionSlug;
  /** what finance calls these bills, e.g. in the import summary */
  label: StaticTranslationString;
  /**
   * Refuses an allocation change that would break one of its bills, by throwing an `APIError`.
   * Gets the ids of its bills that the change touches, before or after.
   */
  validatePaymentChange?: (args: {
    req: PayloadRequest;
    originalDoc: BillPayment;
    next: PaymentAfterChange;
    billIds: string[];
  }) => Promise<void>;
  /**
   * Books its bills in line with the payments allocated to them, after an allocation was
   * changed by hand. Gets the ids of its bills the payment pays now or paid before.
   */
  reconcileAfterPaymentChange: (args: {
    payload: Payload;
    user: unknown;
    doc: BillPayment;
    billIds: string[];
  }) => Promise<void>;
}
