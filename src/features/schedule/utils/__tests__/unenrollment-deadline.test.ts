import {
  DEFAULT_UNENROLLMENT_DEADLINE_MINUTES,
  getShiftStart,
  getUnenrollmentDeadline,
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
