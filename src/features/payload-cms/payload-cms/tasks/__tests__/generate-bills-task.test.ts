jest.mock('@/features/billing/adapters/redis-job-progress.adapter', () => ({
  RedisJobProgressAdapter: jest.fn().mockImplementation(() => ({ clearCancel: jest.fn() })),
}));
jest.mock('@/features/billing/services/job-progress-reporter', () => ({
  createJobProgressReporter: jest.fn(),
}));
jest.mock('@/features/billing/services/bill-generator-service', () => ({
  generateBills: jest.fn(),
}));

import { generateBills } from '@/features/billing/services/bill-generator-service';
import { BillingTaskSlug } from '@/features/billing/types';
import { generateBillsTask } from '@/features/payload-cms/payload-cms/tasks/generate-bills';
import type { PayloadRequest } from 'payload';

const generate = jest.mocked(generateBills);
const queue = jest.fn().mockResolvedValue({ id: 'send-1' });
const request = {
  payload: { jobs: { queue }, logger: { info: jest.fn() } },
} as unknown as PayloadRequest;

const run = async (input: { sendAfterwards?: boolean }): Promise<unknown> => {
  const handler = generateBillsTask.handler as (args: {
    input: { sendAfterwards?: boolean };
    job: { id: string };
    req: PayloadRequest;
  }) => Promise<unknown>;
  return await handler({ input, job: { id: 'generate-1' }, req: request });
};

const summary = { generatedCount: 3, skippedCount: 0, skippedAlreadyExistingCount: 0, errors: [] };

describe('the bill generation job', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queues the send when the daily run asked for it', async () => {
    generate.mockResolvedValue(summary);

    await run({ sendAfterwards: true });

    expect(queue).toHaveBeenCalledWith({ task: BillingTaskSlug.SendBills, input: {} });
  });

  it('leaves sending to the operator when started from the toolbar', async () => {
    generate.mockResolvedValue(summary);

    await run({});

    expect(queue).not.toHaveBeenCalled();
  });

  it('does not send after a cancelled run or from the duplicate worker', async () => {
    generate.mockResolvedValue({ ...summary, cancelled: true });
    await run({ sendAfterwards: true });

    generate.mockResolvedValue({ ...summary, generatedCount: 0, duplicate: true });
    await run({ sendAfterwards: true });

    expect(queue).not.toHaveBeenCalled();
  });
});
