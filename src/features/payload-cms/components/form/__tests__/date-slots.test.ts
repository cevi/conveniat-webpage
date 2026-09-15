import {
  areRangesAllowed,
  DATE_SLOT_RANGE_SEPARATOR,
  DATE_SLOT_VALUE_SEPARATOR,
  getSelectableDays,
  parseDateRangesValue,
  toDateRangesValue,
} from '@/features/payload-cms/components/form/utils/date-slots';

const camp = {
  startDate: '2027-07-12T00:00:00.000Z',
  endDate: '2027-08-06T00:00:00.000Z',
};

/** Validates a submitted value the way the server does. */
const accepts = (
  value: unknown,
  configuration: Parameters<typeof getSelectableDays>[0],
): boolean => {
  const selectable = getSelectableDays(configuration);
  const ranges = parseDateRangesValue(value);
  return selectable !== undefined && ranges !== undefined && areRangesAllowed(ranges, selectable);
};

const range = (startDate: string, endDate: string): string =>
  `${startDate}${DATE_SLOT_VALUE_SEPARATOR}${endDate}`;

const ranges = (...parts: string[]): string => parts.join(DATE_SLOT_RANGE_SEPARATOR);

describe('date range rules', () => {
  it('accepts a range of exactly the minimum length and anything longer', () => {
    expect(accepts(range('2027-07-12', '2027-07-14'), { ...camp, minDays: 3 })).toBe(true);
    expect(accepts(range('2027-07-20', '2027-07-31'), { ...camp, minDays: 3 })).toBe(true);
  });

  it('rejects a range shorter than the minimum', () => {
    expect(accepts(range('2027-07-12', '2027-07-13'), { ...camp, minDays: 3 })).toBe(false);
  });

  it('defaults the minimum to three days', () => {
    expect(accepts(range('2027-07-12', '2027-07-13'), camp)).toBe(false);
    expect(accepts(range('2027-07-12', '2027-07-14'), camp)).toBe(true);
  });

  it('rejects a range longer than the maximum when one is set', () => {
    const configuration = { ...camp, minDays: 3, maxDays: 5 };
    expect(accepts(range('2027-07-12', '2027-07-16'), configuration)).toBe(true);
    expect(accepts(range('2027-07-12', '2027-07-17'), configuration)).toBe(false);
  });

  it('ignores a maximum below the minimum, which a draft can hold', () => {
    expect(accepts(range('2027-07-12', '2027-07-20'), { ...camp, minDays: 3, maxDays: 2 })).toBe(
      true,
    );
  });

  it('rejects days outside the window the editor configured', () => {
    expect(accepts(range('2027-07-10', '2027-07-14'), camp)).toBe(false);
    expect(accepts(range('2027-08-04', '2027-08-08'), camp)).toBe(false);
  });

  it('rejects reversed, malformed and impossible values', () => {
    expect(accepts(range('2027-07-20', '2027-07-14'), camp)).toBe(false);
    expect(accepts('2027-07-12 - 2027-07-14', camp)).toBe(false);
    expect(accepts(range('2027-07-12', '2027-02-30'), camp)).toBe(false);
    expect(accepts('', camp)).toBe(false);
    expect(accepts(42, camp)).toBe(false);
  });

  it('keeps the day the editor picked when the admin panel stored a local-midnight instant', () => {
    // 12.07.2027 picked in CEST (UTC+2) is stored as the previous day in UTC.
    expect(
      getSelectableDays({
        startDate: '2027-07-11T22:00:00.000Z',
        endDate: '2027-08-05T22:00:00.000Z',
      }),
    ).toEqual({
      firstDay: '2027-07-12',
      lastDay: '2027-08-06',
      minDays: 3,
      maxDays: undefined,
      maxRanges: 1,
    });
  });

  it('offers nothing for a window longer than a year, which can only be a mistyped date', () => {
    expect(
      getSelectableDays({ startDate: camp.startDate, endDate: '2028-07-12T00:00:00.000Z' }),
    ).toBeUndefined();
    expect(
      accepts(range('2028-01-10', '2028-01-20'), {
        startDate: camp.startDate,
        endDate: '2028-07-11T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('offers nothing for a window shorter than the minimum or a half-filled block', () => {
    expect(
      getSelectableDays({
        startDate: '2027-07-24T00:00:00.000Z',
        endDate: '2027-07-25T00:00:00.000Z',
        minDays: 3,
      }),
    ).toBeUndefined();
    expect(getSelectableDays({})).toBeUndefined();
    // eslint-disable-next-line unicorn/no-null
    expect(getSelectableDays({ startDate: camp.startDate, endDate: null })).toBeUndefined();
    expect(getSelectableDays({ startDate: 'not a date', endDate: 'neither' })).toBeUndefined();
    expect(getSelectableDays({ startDate: camp.endDate, endDate: camp.startDate })).toBeUndefined();
  });
});

describe('several date ranges', () => {
  const twoSlots = { ...camp, minDays: 3, maxRanges: 2 };

  it('allows only one range unless the editor raises the limit', () => {
    const value = ranges(range('2027-07-12', '2027-07-14'), range('2027-07-20', '2027-07-22'));
    expect(accepts(value, camp)).toBe(false);
    expect(accepts(value, twoSlots)).toBe(true);
  });

  it('still accepts a single range when two are allowed', () => {
    expect(accepts(range('2027-07-12', '2027-07-14'), twoSlots)).toBe(true);
  });

  it('rejects more ranges than allowed', () => {
    const value = ranges(
      range('2027-07-12', '2027-07-14'),
      range('2027-07-18', '2027-07-20'),
      range('2027-07-24', '2027-07-26'),
    );
    expect(accepts(value, twoSlots)).toBe(false);
  });

  it('holds every range to the length limits', () => {
    const value = ranges(range('2027-07-12', '2027-07-14'), range('2027-07-20', '2027-07-21'));
    expect(accepts(value, twoSlots)).toBe(false);
  });

  it('needs at least one free day between ranges', () => {
    const touching = ranges(range('2027-07-12', '2027-07-14'), range('2027-07-15', '2027-07-17'));
    const overlapping = ranges(
      range('2027-07-12', '2027-07-16'),
      range('2027-07-14', '2027-07-18'),
    );
    const oneDayApart = ranges(
      range('2027-07-12', '2027-07-14'),
      range('2027-07-16', '2027-07-18'),
    );
    expect(accepts(touching, twoSlots)).toBe(false);
    expect(accepts(overlapping, twoSlots)).toBe(false);
    expect(accepts(oneDayApart, twoSlots)).toBe(true);
  });

  it('stores ranges earliest first, so an out-of-order submission is rejected', () => {
    const later = { startDate: '2027-07-20', endDate: '2027-07-22' };
    const earlier = { startDate: '2027-07-12', endDate: '2027-07-14' };
    const value = toDateRangesValue([later, earlier]);
    expect(value).toBe(
      ranges(range('2027-07-12', '2027-07-14'), range('2027-07-20', '2027-07-22')),
    );
    expect(accepts(value, twoSlots)).toBe(true);
    expect(
      accepts(
        ranges(range('2027-07-20', '2027-07-22'), range('2027-07-12', '2027-07-14')),
        twoSlots,
      ),
    ).toBe(false);
  });

  it('rejects a value where any one range is malformed', () => {
    expect(accepts(ranges(range('2027-07-12', '2027-07-14'), 'nonsense'), twoSlots)).toBe(false);
    expect(
      accepts(`${range('2027-07-12', '2027-07-14')}${DATE_SLOT_RANGE_SEPARATOR}`, twoSlots),
    ).toBe(false);
  });
});
