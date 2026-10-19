import { BillingTaskSlug } from '@/features/billing/types';
import type { TaskConfig } from 'payload';

/**
 * Marks the registrations a payment import booked as paid in the Cevi.DB.
 *
 * Queued by the import rather than run in its request: every registration costs a few
 * Cevi.DB round trips, and a bank file holds hundreds of payments after a mailing. No retries,
 * because the nightly sync retries any registration this run could not write.
 */
export const writeBackPaymentsTask: TaskConfig<'writeBackPayments'> = {
  slug: BillingTaskSlug.WriteBackPayments,
  retries: 0,
  inputSchema: [{ name: 'participantIds', type: 'json', required: true }],
  handler: async ({ input, req }) => {
    const { writeBackPayments } = await import('@/features/billing/services/payment-import');
    // Typed as any JSON by Payload; the import only ever queues a list of ids.
    const participantIds = Array.isArray(input.participantIds)
      ? input.participantIds.filter((id): id is string => typeof id === 'string')
      : [];
    const result = await writeBackPayments(req.payload, participantIds);
    return { output: { success: true, ...result } };
  },
};
