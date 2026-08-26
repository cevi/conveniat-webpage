import {
  DEFAULT_UNENROLLMENT_DEADLINE_MINUTES,
  getShiftEnd,
  getShiftStart,
  getTimeslotOverlap,
  getUnenrollmentDeadline,
  isShiftOver,
  isUnenrollmentClosed,
} from '@/features/schedule/utils/unenrollment-deadline';

/** a summer camp day, so Swiss local time runs two hours ahead of UTC */
const SUMMER_DAY = '2027-07-24T00:00:00.000Z';

describe('getShiftStart', () => {
  it('reads the start of the timeslot on a Swiss clock, not on the server one', () => {
    const start = getShiftStart({ date: SUMMER_DAY, time: '08:00 - 12:00' });

    expect(start?.toISOString()).toBe('2027-07-24T06:00:00.000Z');
  });

  it('reads the calendar day the admin picked even when the day was stored in local time', () => {
    // the same day, stored as midnight in Zurich rather than midnight UTC
    const start = getShiftStart({ date: '2027-07-23T22:00:00.000Z', time: '08:00 - 12:00' });

    expect(start?.toISOString()).toBe('2027-07-24T06:00:00.000Z');
  });

  it('applies the winter offset outside daylight saving time', () => {
    const start = getShiftStart({ date: '2027-01-15T00:00:00.000Z', time: '08:00 - 12:00' });

    expect(start?.toISOString()).toBe('2027-01-15T07:00:00.000Z');
  });

  it('accepts a timeslot that is only a start time', () => {
    const start = getShiftStart({ date: SUMMER_DAY, time: '08:30' });

    expect(start?.toISOString()).toBe('2027-07-24T06:30:00.000Z');
  });

  it('gives up on a timeslot it cannot read rather than inventing a start', () => {
    expect(getShiftStart({ date: SUMMER_DAY, time: '' })).toBeUndefined();
    expect(getShiftStart({ date: SUMMER_DAY, time: 'ganztags' })).toBeUndefined();
    expect(getShiftStart({ date: 'not a date', time: '08:00 - 12:00' })).toBeUndefined();
  });
});

describe('getUnenrollmentDeadline', () => {
  const timeslot = { date: SUMMER_DAY, time: '08:00 - 12:00' };

  it('closes the window the configured number of minutes before the start', () => {
    expect(getUnenrollmentDeadline(timeslot, 45)?.toISOString()).toBe('2027-07-24T05:15:00.000Z');
  });

  /**
   * Payload only materialises a field on documents saved since it was added, so every shift that
   * existed before this feature carries no value. Those must fall back to the default window
   * rather than read as "withdraw whenever you like".
   */
  it('falls back to the default window for shifts saved before the field existed', () => {
    expect(DEFAULT_UNENROLLMENT_DEADLINE_MINUTES).toBe(30);

    const expected = '2027-07-24T05:30:00.000Z';
    // eslint-disable-next-line unicorn/no-useless-undefined -- exactly what such a shift carries
    expect(getUnenrollmentDeadline(timeslot, undefined)?.toISOString()).toBe(expected);
    // eslint-disable-next-line unicorn/no-null -- exactly what Payload stores for an empty number
    expect(getUnenrollmentDeadline(timeslot, null)?.toISOString()).toBe(expected);
  });

  it('has no deadline at all when an admin sets the window to zero', () => {
    expect(getUnenrollmentDeadline(timeslot, 0)).toBeUndefined();
  });

  it('has no deadline when the timeslot cannot be read', () => {
    expect(getUnenrollmentDeadline({ date: SUMMER_DAY, time: 'ganztags' }, 30)).toBeUndefined();
  });
});

describe('isUnenrollmentClosed', () => {
  const deadline = '2027-07-24T05:30:00.000Z';

  it('is open right up to the deadline and closed from it on', () => {
    expect(isUnenrollmentClosed(deadline, new Date('2027-07-24T05:29:59.000Z'))).toBe(false);
    expect(isUnenrollmentClosed(deadline, new Date('2027-07-24T05:30:00.000Z'))).toBe(true);
    expect(isUnenrollmentClosed(deadline, new Date('2027-07-24T07:00:00.000Z'))).toBe(true);
  });

  /**
   * A client restoring a status persisted before this field existed has no deadline at all. That
   * has to leave withdrawal open - locking helpers out of their own shifts because of a cache
   * from yesterday would be far worse than letting the server refuse the mutation.
   */
  it('leaves the window open when no deadline is known', () => {
    expect(isUnenrollmentClosed(undefined, new Date('2027-07-24T07:00:00.000Z'))).toBe(false);
    // eslint-disable-next-line unicorn/no-null -- a deadline that never made it into the cache
    expect(isUnenrollmentClosed(null, new Date('2027-07-24T07:00:00.000Z'))).toBe(false);
    expect(isUnenrollmentClosed('not a date', new Date('2027-07-24T07:00:00.000Z'))).toBe(false);
  });

  it('accepts the deadline as a Date as well as an ISO string', () => {
    expect(isUnenrollmentClosed(new Date(deadline), new Date('2027-07-24T06:00:00.000Z'))).toBe(
      true,
    );
  });
});

describe('getShiftEnd', () => {
  it('reads the end of the timeslot on a Swiss clock', () => {
    const end = getShiftEnd({ date: SUMMER_DAY, time: '08:00 - 12:00' });

    expect(end?.toISOString()).toBe('2027-07-24T10:00:00.000Z');
  });

  it('carries a slot that runs past midnight into the next day', () => {
    // a night watch, not a shift that ended twenty-one and a half hours before it started
    const end = getShiftEnd({ date: SUMMER_DAY, time: '23:30 - 02:00' });

    expect(end?.toISOString()).toBe('2027-07-25T00:00:00.000Z');
  });

  it('rolls a slot past midnight over the end of the month', () => {
    const end = getShiftEnd({ date: '2027-07-31T00:00:00.000Z', time: '22:00 - 01:00' });

    expect(end?.toISOString()).toBe('2027-07-31T23:00:00.000Z');
  });

  it('has no end for an unreadable timeslot', () => {
    expect(getShiftEnd({ date: SUMMER_DAY, time: '08:00' })).toBeUndefined();
    expect(getShiftEnd({ date: 'not a date', time: '08:00 - 12:00' })).toBeUndefined();
  });
});

describe('isShiftOver', () => {
  it('is over once the end has passed', () => {
    const timeslot = { date: SUMMER_DAY, time: '08:00 - 12:00' };

    expect(isShiftOver(timeslot, new Date('2027-07-24T10:00:01.000Z'))).toBe(true);
  });

  it('is not over while it is still running', () => {
    const timeslot = { date: SUMMER_DAY, time: '08:00 - 12:00' };

    expect(isShiftOver(timeslot, new Date('2027-07-24T09:00:00.000Z'))).toBe(false);
  });

  /**
   * Greying out a shift whose slot cannot be placed in time would hide it from the helpers who
   * still have to turn up for it, so an unreadable slot counts as not over.
   */
  it('treats an unreadable timeslot as not over', () => {
    expect(isShiftOver({ date: SUMMER_DAY, time: 'irgendwann' }, new Date())).toBe(false);
  });
});

describe('getTimeslotOverlap', () => {
  it('returns the stretch two slots have in common', () => {
    const overlap = getTimeslotOverlap(
      { date: SUMMER_DAY, time: '09:00 - 12:00' },
      { date: SUMMER_DAY, time: '07:00 - 10:00' },
    );

    expect(overlap?.start.toISOString()).toBe('2027-07-24T07:00:00.000Z'); // 09:00 in Zurich
    expect(overlap?.end.toISOString()).toBe('2027-07-24T08:00:00.000Z'); // 10:00 in Zurich
  });

  it('has no overlap for slots that merely touch', () => {
    const overlap = getTimeslotOverlap(
      { date: SUMMER_DAY, time: '09:00 - 12:00' },
      { date: SUMMER_DAY, time: '12:00 - 14:00' },
    );

    expect(overlap).toBeUndefined();
  });

  /** A night watch collides with the early shift of the *next* morning, not of the same one. */
  it('carries a slot past midnight into the following day', () => {
    const overlap = getTimeslotOverlap(
      { date: SUMMER_DAY, time: '23:00 - 02:00' },
      { date: '2027-07-25T00:00:00.000Z', time: '01:00 - 03:00' },
    );

    expect(overlap?.start.toISOString()).toBe('2027-07-24T23:00:00.000Z'); // 01:00 in Zurich
    expect(overlap?.end.toISOString()).toBe('2027-07-25T00:00:00.000Z'); // 02:00 in Zurich
  });
});
