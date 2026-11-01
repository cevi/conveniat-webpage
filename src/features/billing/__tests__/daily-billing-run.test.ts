import {
  findPipelineBlocker,
  isDailyRunDue,
  runDailyBilling,
  type LatestPipelineJob,
} from '@/features/billing/services/daily-billing-run';
import { BillingJobStatus, BillingTaskSlug } from '@/features/billing/types';
import type { Payload } from 'payload';

const mockAcquire = jest.fn();
jest.mock('@/features/billing/adapters/redis-run-lock.adapter', () => ({
  RedisRunLockAdapter: jest.fn().mockImplementation(() => ({ acquire: mockAcquire })),
}));

// Local time, like the container's Europe/Zurich clock the hours are compared against.
const NOW = new Date('2026-10-20T07:15:00');
const EARLIER_TODAY = new Date('2026-10-20T03:40:00').toISOString();
const YESTERDAY = new Date('2026-10-19T07:20:00').toISOString();

const done = (completedAt: string, summary: Record<string, unknown> = {}): LatestPipelineJob => ({
  status: BillingJobStatus.Success,
  completedAt,
  summary,
});

describe('isDailyRunDue', () => {
  it('does nothing until an operator switches it on', () => {
    expect(isDailyRunDue(undefined, NOW).due).toBe(false);
    expect(isDailyRunDue({ enabled: false, hour: 6 }, NOW).due).toBe(false);
  });

  it('waits for the configured hour', () => {
    expect(isDailyRunDue({ enabled: true, hour: 8 }, NOW).due).toBe(false);
  });

  it('runs on any later hour of the day, so a late sync still gets its run', () => {
    expect(isDailyRunDue({ enabled: true, hour: 6 }, NOW).due).toBe(true);
    expect(isDailyRunDue({ enabled: true, hour: 6 }, new Date('2026-10-20T22:20:00')).due).toBe(
      true,
    );
  });

  it('runs once a day', () => {
    expect(isDailyRunDue({ enabled: true, hour: 6, lastRunAt: EARLIER_TODAY }, NOW).due).toBe(
      false,
    );
    expect(isDailyRunDue({ enabled: true, hour: 6, lastRunAt: YESTERDAY }, NOW).due).toBe(true);
  });

  it('starts at six when the settings carry no hour', () => {
    expect(isDailyRunDue({ enabled: true }, new Date('2026-10-20T05:20:00')).due).toBe(false);
    expect(isDailyRunDue({ enabled: true }, new Date('2026-10-20T06:20:00')).due).toBe(true);
  });
});

describe('findPipelineBlocker', () => {
  it('lets a run start after a sync that ran to the end today', () => {
    expect(findPipelineBlocker({ sync: done(EARLIER_TODAY) }, NOW)).toBeUndefined();
  });

  it('does not let the errors of single participants hold the whole run back', () => {
    const sync = done(EARLIER_TODAY, { errors: ['Teilnehmer 42: Adresse fehlt'] });
    expect(findPipelineBlocker({ sync }, NOW)).toBeUndefined();
  });

  it('refuses to bill on yesterday’s sync', () => {
    expect(findPipelineBlocker({ sync: done(YESTERDAY) }, NOW)).toBe(
      'No sync has completed today.',
    );
  });

  it('refuses after a sync that failed or was cancelled', () => {
    const failed: LatestPipelineJob = { status: BillingJobStatus.Failed };
    expect(findPipelineBlocker({ sync: failed }, NOW)).toBe(
      'The latest sync did not run to the end.',
    );
    expect(findPipelineBlocker({ sync: done(EARLIER_TODAY, { cancelled: true }) }, NOW)).toBe(
      'The latest sync did not run to the end.',
    );
  });

  it('waits for a sync, a generation or a send that is still running', () => {
    const running: LatestPipelineJob = { status: BillingJobStatus.Pending };
    expect(findPipelineBlocker({ sync: running }, NOW)).toBe('The sync is still running.');
    expect(findPipelineBlocker({ sync: done(EARLIER_TODAY), generate: running }, NOW)).toBe(
      'A bill generation or send is still running.',
    );
    expect(findPipelineBlocker({ sync: done(EARLIER_TODAY), send: running }, NOW)).toBe(
      'A bill generation or send is still running.',
    );
  });
});

describe('runDailyBilling', () => {
  const release = jest.fn();

  const createPayload = (
    config: Record<string, unknown>,
    jobs: Partial<Record<BillingTaskSlug, Record<string, unknown>>>,
  ): {
    payload: Payload;
    queue: jest.Mock;
    updateGlobal: jest.Mock;
  } => {
    const queue = jest.fn().mockResolvedValue({ id: 'generate-1' });
    const updateGlobal = jest.fn().mockResolvedValue({});
    const find = jest.fn(({ where }: { where: { and: [{ taskSlug: { equals: string } }] } }) => {
      const job = jobs[where.and[0].taskSlug.equals as BillingTaskSlug];
      return Promise.resolve({ docs: job === undefined ? [] : [job] });
    });
    const payload = {
      findGlobal: jest.fn().mockResolvedValue({ dailyBillingRun: config }),
      find,
      updateGlobal,
      jobs: { queue },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    } as unknown as Payload;
    return { payload, queue, updateGlobal };
  };

  const syncedToday = {
    [BillingTaskSlug.SyncParticipants]: {
      completedAt: EARLIER_TODAY,
      log: [{ taskSlug: BillingTaskSlug.SyncParticipants, output: { errors: [] } }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAcquire.mockResolvedValue({ acquired: true, lock: { release } });
  });

  it('queues a generation that sends afterwards and records the day', async () => {
    const { payload, queue, updateGlobal } = createPayload({ enabled: true, hour: 6 }, syncedToday);

    const result = await runDailyBilling(payload, { runOwner: 'job-1', now: NOW });

    expect(result).toEqual({ started: true, generateJobId: 'generate-1' });
    expect(queue).toHaveBeenCalledWith({
      task: BillingTaskSlug.GenerateBills,
      input: { sendAfterwards: true },
    });
    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { dailyBillingRun: { enabled: true, hour: 6, lastRunAt: NOW.toISOString() } },
      }),
    );
    expect(release).toHaveBeenCalled();
  });

  it('starts nothing and keeps the day open while today’s sync is missing', async () => {
    const { payload, queue, updateGlobal } = createPayload(
      { enabled: true, hour: 6 },
      { [BillingTaskSlug.SyncParticipants]: { completedAt: YESTERDAY, log: [] } },
    );

    const result = await runDailyBilling(payload, { runOwner: 'job-1', now: NOW });

    expect(result).toEqual({ started: false, reason: 'No sync has completed today.' });
    expect(queue).not.toHaveBeenCalled();
    expect(updateGlobal).not.toHaveBeenCalled();
  });

  it('starts nothing when it already ran today', async () => {
    const { payload, queue } = createPayload(
      { enabled: true, hour: 6, lastRunAt: EARLIER_TODAY },
      syncedToday,
    );

    const result = await runDailyBilling(payload, { runOwner: 'job-1', now: NOW });

    expect(result.started).toBe(false);
    expect(queue).not.toHaveBeenCalled();
  });

  it('leaves the decision to whoever holds the lock', async () => {
    mockAcquire.mockResolvedValue({ acquired: false, heldBy: 'job-2' });
    const { payload, queue } = createPayload({ enabled: true, hour: 6 }, syncedToday);

    const result = await runDailyBilling(payload, { runOwner: 'job-1', now: NOW });

    expect(result.started).toBe(false);
    expect(queue).not.toHaveBeenCalled();
  });
});
