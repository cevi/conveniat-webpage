import type { PayloadRequest, TaskConfig } from 'payload';

export const generateBillsTask: TaskConfig = {
  slug: 'generateBills',
  retries: 0,
  inputSchema: [],
  handler: async ({
    req,
  }: {
    req: PayloadRequest;
  }): Promise<{ output: Record<string, unknown> }> => {
    const { payload } = req;
    const { generateBills } = await import('@/features/billing/services/bill-generator-service');
    const result = await generateBills(payload);

    return {
      output: {
        success: true,
        ...result,
      },
    };
  },
};
