import {
  scheduleAt,
  scheduleUnlessQueued,
  skipSchedule,
} from '@/features/payload-cms/payload-cms/tasks/schedule-decision';

const threeInTheMorning = new Date('2026-09-21T01:00:00.000Z');

describe('scheduleAt', () => {
  it('queues the run for the time the cron asked for', () => {
    // A decision without `waitUntil` is runnable immediately, so the queue runs it on the
    // next poll and schedules the one after that ten seconds later. That turned the
    // nightly participant sync into a sync every two minutes.
    expect(scheduleAt(threeInTheMorning)).toEqual({
      shouldSchedule: true,
      input: {},
      waitUntil: threeInTheMorning,
    });
  });

  it('still queues the run when the scheduler worked out no time', () => {
    // `queueable.waitUntil` is optional in Payload's types, so the call site can hand us
    // nothing. Queueing without a start time is what every one of these hooks used to do.
    const queueableWithoutTime: { waitUntil?: Date } = {};
    expect(scheduleAt(queueableWithoutTime.waitUntil)).toEqual({ shouldSchedule: true, input: {} });
  });
});

describe('scheduleUnlessQueued', () => {
  it('queues the run when nothing of this task is queued or in flight', () => {
    expect(scheduleUnlessQueued(0, threeInTheMorning)).toEqual({
      shouldSchedule: true,
      input: {},
      waitUntil: threeInTheMorning,
    });
  });

  it('leaves the occurrence alone while a run is already queued', () => {
    // The queued run *is* this occurrence: it is waiting for its start time, which a
    // count of runnable or active jobs includes.
    expect(scheduleUnlessQueued(1, threeInTheMorning)).toEqual(skipSchedule());
  });
});
