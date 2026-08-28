/* eslint-disable @typescript-eslint/unbound-method */
import type { JobProgressPort } from '@/features/billing/ports/job-progress.port';
import { createJobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import { BillingTaskSlug } from '@/features/billing/types';

describe('createJobProgressReporter', () => {
  let mockProgressStore: jest.Mocked<JobProgressPort>;

  beforeEach(() => {
    mockProgressStore = {
      publish: jest.fn(),
      read: jest.fn(),
      clear: jest.fn(),
      requestCancel: jest.fn(),
      isCancelRequested: jest.fn().mockResolvedValue(false),
      clearCancel: jest.fn(),
    };
  });

  it('stamps the job id and a stable start time onto every published update', async () => {
    const reporter = createJobProgressReporter(
      mockProgressStore,
      BillingTaskSlug.SyncParticipants,
      'job-1',
    );

    await reporter.report({
      processedItems: 3,
      totalItems: 10,
      currentItemName: 'Sommerlager Bern',
      runningSummary: { newCount: 2 },
    });
    await reporter.report({
      processedItems: 4,
      totalItems: 10,
      currentItemName: 'Sommerlager Chur',
      runningSummary: { newCount: 3 },
    });

    expect(mockProgressStore.publish).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = mockProgressStore.publish.mock.calls;

    expect(firstCall?.[0]).toBe(BillingTaskSlug.SyncParticipants);
    expect(firstCall?.[1]).toMatchObject({
      jobId: 'job-1',
      processedItems: 3,
      totalItems: 10,
      currentItemName: 'Sommerlager Bern',
      runningSummary: { newCount: 2 },
    });

    // The start time identifies the run, so it must not drift between updates.
    expect(secondCall?.[1].startedAt).toBe(firstCall?.[1].startedAt);
    expect(secondCall?.[1].processedItems).toBe(4);
  });

  it('never lets a broken progress store fail the job it is decorating', async () => {
    mockProgressStore.publish.mockRejectedValue(new Error('redis is down'));
    mockProgressStore.isCancelRequested.mockRejectedValue(new Error('redis is down'));

    const reporter = createJobProgressReporter(
      mockProgressStore,
      BillingTaskSlug.GenerateBills,
      'job-2',
    );

    await expect(
      reporter.report({
        processedItems: 1,
        totalItems: 2,
        currentItemName: 'Max Mustermann',
        runningSummary: {},
      }),
    ).resolves.toBeUndefined();

    // A store that cannot answer must not be read as "the operator pressed cancel".
    await expect(reporter.shouldCancel()).resolves.toBe(false);
  });

  it('reports a cancellation once the store carries the flag', async () => {
    mockProgressStore.isCancelRequested.mockResolvedValue(true);
    const reporter = createJobProgressReporter(
      mockProgressStore,
      BillingTaskSlug.SendBills,
      'job-3',
    );

    await expect(reporter.shouldCancel()).resolves.toBe(true);
    expect(mockProgressStore.isCancelRequested).toHaveBeenCalledWith(BillingTaskSlug.SendBills);
  });
});
