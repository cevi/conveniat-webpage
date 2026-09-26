import { autoCheckoutPresenceTask } from '@/features/presence/payload-cms/tasks/auto-checkout-presence';
import type { PayloadRequest } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

jest.mock('payload', () => ({
  countRunnableOrActiveJobsForQueue: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: { user: { findMany: jest.fn() } },
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_PRESENCE_TRACKING: true },
}));

jest.mock('@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs', () => ({
  DEFAULT_QUEUE: 'default',
  cleanupCompletedScheduledJobs: jest.fn(),
  cleanupStaleScheduledJobs: jest.fn(),
}));

const countJobs = countRunnableOrActiveJobsForQueue as jest.MockedFunction<
  typeof countRunnableOrActiveJobsForQueue
>;

const nextCronSlot = new Date('2027-07-24T10:05:00.000Z');

const runBeforeSchedule = async (): Promise<{
  shouldSchedule: boolean;
  waitUntil?: Date | undefined;
}> => {
  const scheduleConfig = autoCheckoutPresenceTask.schedule?.[0];
  const beforeSchedule = scheduleConfig?.hooks?.beforeSchedule;
  if (scheduleConfig === undefined || beforeSchedule === undefined) {
    throw new Error('autoCheckoutPresence has no beforeSchedule hook');
  }

  return await beforeSchedule({
    defaultBeforeSchedule: jest.fn(),
    jobStats: {},
    queueable: {
      scheduleConfig,
      taskConfig: autoCheckoutPresenceTask,
      waitUntil: nextCronSlot,
    },
    req: { payload: { logger: { warn: jest.fn() } } } as unknown as PayloadRequest,
  } as unknown as Parameters<typeof beforeSchedule>[0]);
};

describe('autoCheckoutPresence scheduling', () => {
  beforeEach(() => {
    countJobs.mockReset();
  });

  it('holds the queued job back until the next cron slot', async () => {
    // Without this the job is runnable the moment it is written, so the runner executed it on
    // every ten-second tick instead of every five minutes.
    countJobs.mockResolvedValue(0);

    const result = await runBeforeSchedule();

    expect(result.shouldSchedule).toBe(true);
    expect(result.waitUntil).toEqual(nextCronSlot);
  });

  it('does not schedule a second run while one is still pending', async () => {
    countJobs.mockResolvedValue(1);

    const result = await runBeforeSchedule();

    expect(result.shouldSchedule).toBe(false);
  });
});
