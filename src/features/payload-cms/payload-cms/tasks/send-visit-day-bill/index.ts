import type { TaskConfig } from 'payload';

/**
 * Renders a Besuchstag bill and puts its mail into the outbox, queued when a registration is
 * saved and by the «erneut senden» action.
 *
 * No retries: a second run after the mail was queued would mail the bill twice. A run that
 * fails marks the bill's mail as failed, which the list shows, and finance sends it again.
 */
export const sendVisitDayBillTask: TaskConfig<'sendVisitDayBill'> = {
  slug: 'sendVisitDayBill',
  retries: 0,
  inputSchema: [
    { name: 'billId', type: 'text', required: true },
    { name: 'actor', type: 'text', required: true },
  ],
  handler: async ({ input, req }) => {
    const { sendVisitDayBill } = await import('@/features/visit-day/billing/visit-day-bill-mail');
    const { recordVisitDayBillEvent } =
      await import('@/features/visit-day/billing/visit-day-bill-events');
    try {
      await sendVisitDayBill(req.payload, { billId: input.billId, actor: input.actor });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      req.payload.logger.error({ err: error, msg: `Besuchstag bill ${input.billId} not sent` });
      await req.payload.update({
        collection: 'visit-day-bills',
        id: input.billId,
        overrideAccess: true,
        data: { mailStatus: 'failed' },
      });
      await recordVisitDayBillEvent(req.payload, {
        bill: input.billId,
        action: 'mail_failed',
        actor: input.actor,
        details: `Die Rechnung konnte nicht erstellt oder eingereiht werden: ${reason}`,
      });
      throw error;
    }
    return { output: { success: true } };
  },
};
