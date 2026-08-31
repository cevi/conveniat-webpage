import { classifyLockConflict } from '@/features/billing/ports/run-lock.port';
import { selectTaskLogOutput } from '@/features/billing/services/job-log';

describe('classifyLockConflict', () => {
  it('treats the same run holding the lock as a duplicate worker', () => {
    // Both replicas poll the job queue, so one queued job can be executed twice. The
    // loser is not a competing run and must not be reported as one.
    expect(classifyLockConflict('job:4711', 'job:4711')).toBe('duplicate-worker');
  });

  it('treats a different run as a genuine conflict', () => {
    expect(classifyLockConflict('job:4711', 'job:4712')).toBe('other-run');
    expect(classifyLockConflict('job:4711', 'request:abc')).toBe('other-run');
  });

  it('treats an unreadable holder as a genuine conflict', () => {
    // A lock written by an older build carries no owner. Assuming it is ours would let
    // two real runs proceed together, so the cautious answer is the right one.
    expect(classifyLockConflict(undefined, 'job:4711')).toBe('other-run');
  });
});

describe('selectTaskLogOutput', () => {
  const real = { taskSlug: 'generateBills', output: { generatedCount: 27 } };
  const duplicate = { taskSlug: 'generateBills', output: { generatedCount: 0, duplicate: true } };

  it('prefers the entry that did the work over a duplicate written first', () => {
    // The duplicate finishes instantly, so it is normally the first entry on the job —
    // which is exactly why taking the first match reported "0 generated" for a run that
    // had generated everything.
    expect(selectTaskLogOutput([duplicate, real], 'generateBills')).toEqual({
      generatedCount: 27,
    });
  });

  it('still prefers the real entry when it came first', () => {
    expect(selectTaskLogOutput([real, duplicate], 'generateBills')).toEqual({
      generatedCount: 27,
    });
  });

  it('falls back to the duplicate when that is all there is', () => {
    expect(selectTaskLogOutput([duplicate], 'generateBills')).toEqual({
      generatedCount: 0,
      duplicate: true,
    });
  });

  it('ignores entries belonging to another task', () => {
    const otherTask = { taskSlug: 'sendBills', output: { sentCount: 5 } };
    expect(selectTaskLogOutput([otherTask, real], 'generateBills')).toEqual({
      generatedCount: 27,
    });
    expect(selectTaskLogOutput([otherTask], 'generateBills')).toBeUndefined();
  });

  it('returns nothing when the job has no log entries', () => {
    expect(selectTaskLogOutput([], 'generateBills')).toBeUndefined();
  });
});
