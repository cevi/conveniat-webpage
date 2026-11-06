import { startJobRunner } from '@/features/payload-cms/payload-cms/tasks/job-runner';
import type { Payload } from 'payload';

let leaseHeld = true;
const stopLease = jest.fn();

jest.mock('@/lib/redis-lease', () => ({
  startRedisLease: (): { isHeld: () => boolean; stop: () => void } => ({
    isHeld: (): boolean => leaseHeld,
    stop: stopLease,
  }),
}));
jest.mock('@/features/payload-cms/payload-cms/tasks/job-queues', () => ({
  getJobQueueRuns: (): { queue: string; limit: number; silent: boolean }[] => [
    { queue: 'default', limit: 10, silent: false },
    { queue: 'mail', limit: 10, silent: false },
  ],
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ error: jest.fn() }),
}));

const payloadWith = (run: jest.Mock): { payload: Payload; handleSchedules: jest.Mock } => {
  const handleSchedules = jest.fn().mockResolvedValue({});
  const payload = {
    config: { jobs: { scheduling: true } },
    jobs: { run, handleSchedules },
  } as unknown as Payload;
  return { payload, handleSchedules };
};

const ranQueues = (run: jest.Mock): string[] =>
  run.mock.calls.map(([arguments_]: [{ queue: string }]) => arguments_.queue);

describe('startJobRunner', () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    leaseHeld = true;
    stopLease.mockClear();
  });

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
  });

  it('schedules and runs every queue while this replica holds the lease', async () => {
    const run = jest.fn().mockResolvedValue({});
    const { payload, handleSchedules } = payloadWith(run);
    stop = startJobRunner(payload);

    await jest.advanceTimersByTimeAsync(10_000);

    expect(handleSchedules.mock.calls).toEqual([[{ queue: 'default' }], [{ queue: 'mail' }]]);
    expect(ranQueues(run)).toEqual(['default', 'mail']);
  });

  it('neither schedules nor runs anything while another replica holds the lease', async () => {
    leaseHeld = false;
    const run = jest.fn().mockResolvedValue({});
    const { payload, handleSchedules } = payloadWith(run);
    stop = startJobRunner(payload);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(handleSchedules).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('skips the ticks of a queue whose previous run is still going, and only that queue', async () => {
    const mailRun = Promise.withResolvers<void>();
    const run = jest.fn(async ({ queue }: { queue: string }): Promise<object> => {
      if (queue === 'mail') await mailRun.promise;
      return {};
    });
    const { payload } = payloadWith(run);
    stop = startJobRunner(payload);

    await jest.advanceTimersByTimeAsync(30_000);
    expect(ranQueues(run)).toEqual(['default', 'mail', 'default', 'default']);

    mailRun.resolve();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(ranQueues(run).filter((queue) => queue === 'mail')).toHaveLength(2);
  });

  it('keeps ticking after a run fails', async () => {
    const run = jest.fn().mockRejectedValueOnce(new Error('mongo timeout')).mockResolvedValue({});
    const { payload } = payloadWith(run);
    stop = startJobRunner(payload);

    await jest.advanceTimersByTimeAsync(20_000);

    expect(run).toHaveBeenCalledTimes(4);
  });

  it('stops the lease renewal when it is stopped', () => {
    const { payload } = payloadWith(jest.fn());
    startJobRunner(payload)();

    expect(stopLease).toHaveBeenCalled();
  });
});
