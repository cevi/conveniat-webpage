import { campClockOf, campInstantOf } from '@/utils/camp-clock';

describe('campInstantOf', () => {
  it('reads a summer time on the camp clock as two hours ahead of UTC', () => {
    expect(campInstantOf('2027-07-24', 17 * 60)?.toISOString()).toBe('2027-07-24T15:00:00.000Z');
  });

  it('reads a winter time as one hour ahead of UTC', () => {
    expect(campInstantOf('2027-01-15', 9 * 60)?.toISOString()).toBe('2027-01-15T08:00:00.000Z');
  });

  it('runs minutes past midnight into the next day', () => {
    expect(campInstantOf('2027-07-24', 24 * 60 + 30)?.toISOString()).toBe(
      '2027-07-24T22:30:00.000Z',
    );
  });

  it('is the inverse of campClockOf on both sides of each switch', () => {
    for (const [dayKey, minutes] of [
      ['2027-03-27', 23 * 60],
      ['2027-03-28', 1 * 60 + 30],
      ['2027-03-28', 3 * 60 + 30],
      ['2027-10-31', 1 * 60 + 30],
      ['2027-10-31', 3 * 60 + 30],
    ] as const) {
      const instant = campInstantOf(dayKey, minutes);
      expect(instant === undefined ? undefined : campClockOf(instant)).toEqual({
        dayKey,
        minutes,
      });
    }
  });

  it('moves a time the switch to summer time skips an hour later', () => {
    // 02:30 does not exist on 28 March 2027 in Zurich; it becomes 03:30 summer time
    expect(campInstantOf('2027-03-28', 2 * 60 + 30)?.toISOString()).toBe(
      '2027-03-28T01:30:00.000Z',
    );
  });

  it('does not invent a moment for a day it cannot read', () => {
    expect(campInstantOf('', 600)).toBeUndefined();
  });
});
