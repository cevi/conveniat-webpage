import type { ReminderTiming } from '@/features/schedule/utils/reminder-timing';
import {
  dueReminderPushes,
  mayBeDue,
  recipientsOf,
  reminderTimingOf,
  resolveDueReminders,
  startOfEntry,
} from '@/features/schedule/utils/reminder-timing';

/** Ballspiele on Saturday, 24 July 2027, 17:00 on the camp's clock, 15:00 UTC */
const ballspiele = { date: '2027-07-24T12:00:00.000Z', time: '17:00 - 17:30' };
const start = new Date('2027-07-24T15:00:00.000Z');
const at = (iso: string): Date => new Date(iso);
const defaults: ReminderTiming = { leadMinutes: 15, atStart: true };

describe('startOfEntry', () => {
  it('starts a slot at its time on the camp clock, whatever timezone the server runs in', () => {
    expect(startOfEntry(ballspiele)?.toISOString()).toBe(start.toISOString());
  });

  it('starts a winter slot at its time on the camp clock as well', () => {
    expect(
      startOfEntry({ date: '2027-12-04T12:00:00.000Z', time: '17:00 - 18:00' })?.toISOString(),
    ).toBe('2027-12-04T16:00:00.000Z');
  });

  it('gives no start for a slot a draft left unreadable', () => {
    expect(startOfEntry({ date: '2027-07-24T12:00:00.000Z', time: '' })).toBeUndefined();
    expect(startOfEntry({ date: 'soon', time: '17:00 - 17:30' })).toBeUndefined();
  });
});

describe('dueReminderPushes', () => {
  it('sends nothing before the lead time', () => {
    expect(dueReminderPushes(start, defaults, at('2027-07-24T14:44:59.000Z'))).toEqual([]);
  });

  it('sends the push before the start once the lead time is reached', () => {
    expect(dueReminderPushes(start, defaults, at('2027-07-24T14:45:00.000Z'))).toEqual([
      { kind: 'LEAD', scheduledFor: at('2027-07-24T14:45:00.000Z') },
    ]);
  });

  it('still sends it when the runs of the last four minutes were missed', () => {
    expect(dueReminderPushes(start, defaults, at('2027-07-24T14:49:30.000Z'))).toHaveLength(1);
  });

  it('gives it up after five minutes', () => {
    expect(dueReminderPushes(start, defaults, at('2027-07-24T14:50:00.000Z'))).toEqual([]);
  });

  it('does not send the push before the start once the block has started', () => {
    const late = { leadMinutes: 5, atStart: false };
    expect(dueReminderPushes(start, late, at('2027-07-24T15:01:00.000Z'))).toEqual([]);
  });

  it('sends the push at the start for five minutes, and never later', () => {
    expect(dueReminderPushes(start, defaults, at('2027-07-24T15:00:00.000Z'))).toEqual([
      { kind: 'START', scheduledFor: start },
    ]);
    expect(dueReminderPushes(start, defaults, at('2027-07-24T15:04:59.000Z'))).toHaveLength(1);
    expect(dueReminderPushes(start, defaults, at('2027-07-24T15:05:00.000Z'))).toEqual([]);
  });

  it('sends nothing the user switched off', () => {
    const off = { leadMinutes: 0, atStart: false };
    expect(dueReminderPushes(start, off, at('2027-07-24T14:45:00.000Z'))).toEqual([]);
    expect(dueReminderPushes(start, off, at('2027-07-24T15:00:00.000Z'))).toEqual([]);
  });

  it('tells which starts any timing could make due now', () => {
    expect(mayBeDue(start, at('2027-07-24T14:30:00.000Z'))).toBe(true);
    expect(mayBeDue(start, at('2027-07-24T14:29:00.000Z'))).toBe(false);
    expect(mayBeDue(start, at('2027-07-24T15:05:00.000Z'))).toBe(false);
  });
});

describe('reminderTimingOf', () => {
  it('reads a missing lead time as none and an unknown one as none', () => {
    // eslint-disable-next-line unicorn/no-null -- the column is nullable
    expect(reminderTimingOf({ reminderLeadMinutes: null, reminderAtStart: true })).toEqual({
      leadMinutes: 0,
      atStart: true,
    });
    expect(reminderTimingOf({ reminderLeadMinutes: 7, reminderAtStart: false })).toEqual({
      leadMinutes: 0,
      atStart: false,
    });
  });

  it('gives a user without a row 15 minutes before and the start', () => {
    expect(reminderTimingOf()).toEqual(defaults);
  });
});

describe('recipientsOf and resolveDueReminders', () => {
  const entry = { id: 'slot-q5', type: 'PROGRAM' as const, start };
  const shift = { id: 'shift-1', type: 'SHIFT' as const, start };

  it('reminds who set a reminder and who is enrolled, but not who switched it off', () => {
    const recipients = recipientsOf(
      entry,
      [
        { userId: 'anna', entryId: 'slot-q5', enabled: true },
        { userId: 'beat', entryId: 'slot-q5', enabled: false },
        { userId: 'carla', entryId: 'slot-q7', enabled: true },
      ],
      [
        { userId: 'beat', courseId: 'slot-q5', courseType: 'PROGRAM' },
        { userId: 'dario', courseId: 'slot-q5', courseType: 'PROGRAM' },
        // a shift enrolment with a colliding id is not an enrolment in the block
        { userId: 'eva', courseId: 'slot-q5', courseType: 'SHIFT' },
      ],
    );
    expect([...recipients].sort()).toEqual(['anna', 'dario']);
  });

  it('reminds a helper of their Schichteinsatz without being asked', () => {
    expect([
      ...recipientsOf(shift, [], [{ userId: 'fabio', courseId: 'shift-1', courseType: 'SHIFT' }]),
    ]).toEqual(['fabio']);
  });

  it('times every push by its recipient', () => {
    const due = resolveDueReminders({
      entries: [entry],
      reminders: [
        { userId: 'anna', entryId: 'slot-q5', enabled: true },
        { userId: 'beat', entryId: 'slot-q5', enabled: true },
        { userId: 'carla', entryId: 'slot-q5', enabled: true },
      ],
      enrollments: [],
      timings: new Map([
        ['beat', { leadMinutes: 30, atStart: true }],
        ['carla', { leadMinutes: 0, atStart: false }],
      ]),
      now: at('2027-07-24T14:45:00.000Z'),
    });
    expect(due).toEqual([
      {
        userId: 'anna',
        entryId: 'slot-q5',
        kind: 'LEAD',
        leadMinutes: 15,
        scheduledFor: at('2027-07-24T14:45:00.000Z'),
      },
    ]);
  });
});
