import { backfillBillPayments } from '@/features/billing/services/backfill-bill-payments';
import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/**
 * Stores the bookings from before payments had their own collection as payments, so a second
 * payment for one of those bills reads as a double payment.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const created = await backfillBillPayments(payload);
  if (created > 0) payload.logger.info(`Stored ${String(created)} earlier bookings as payments`);
}

/** Not reversible: the payments may have been matched against since. */
export async function down(): Promise<void> {}
