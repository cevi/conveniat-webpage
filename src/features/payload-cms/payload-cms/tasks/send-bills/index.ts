import type { PayloadRequest, TaskConfig } from 'payload';

export const sendBillsTask: TaskConfig = {
  slug: 'sendBills',
  retries: 0,
  inputSchema: [],
  handler: async ({
    req,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = req;
    const { sendBills } = await import('@/features/billing/services/email-service');
    const result = await sendBills(payload);

    return {
      output: {
        success: true,
        ...result,
      },
    };
  },
};
