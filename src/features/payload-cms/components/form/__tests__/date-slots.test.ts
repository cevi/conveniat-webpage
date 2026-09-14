import {
  DATE_SLOT_VALUE_SEPARATOR,
  getSelectableDays,
  isRangeAllowed,
  parseDateRangeValue,
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
  const range = parseDateRangeValue(value);
  return selectable !== undefined && range !== undefined && isRangeAllowed(range, selectable);
};

describe('date range rules', () => {
  it('accepts a range of exactly the minimum length and anything longer', () => {
    expect(
      accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-07-14`, { ...camp, minDays: 3 }),
    ).toBe(true);
    expect(
      accepts(`2027-07-20${DATE_SLOT_VALUE_SEPARATOR}2027-07-31`, { ...camp, minDays: 3 }),
    ).toBe(true);
  });

  it('rejects a range shorter than the minimum', () => {
    expect(
      accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-07-13`, { ...camp, minDays: 3 }),
    ).toBe(false);
  });

  it('defaults the minimum to three days', () => {
    expect(accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-07-13`, camp)).toBe(false);
    expect(accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-07-14`, camp)).toBe(true);
  });

  it('rejects a range longer than the maximum when one is set', () => {
    const configuration = { ...camp, minDays: 3, maxDays: 5 };
    expect(accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-07-16`, configuration)).toBe(true);
    expect(accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-07-17`, configuration)).toBe(false);
  });

  it('ignores a maximum below the minimum, which a draft can hold', () => {
    expect(
      accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-07-20`, {
        ...camp,
        minDays: 3,
        maxDays: 2,
      }),
    ).toBe(true);
  });

  it('rejects days outside the window the editor configured', () => {
    expect(accepts(`2027-07-10${DATE_SLOT_VALUE_SEPARATOR}2027-07-14`, camp)).toBe(false);
    expect(accepts(`2027-08-04${DATE_SLOT_VALUE_SEPARATOR}2027-08-08`, camp)).toBe(false);
  });

  it('rejects reversed, malformed and impossible values', () => {
    expect(accepts(`2027-07-20${DATE_SLOT_VALUE_SEPARATOR}2027-07-14`, camp)).toBe(false);
    expect(accepts('2027-07-12 - 2027-07-14', camp)).toBe(false);
    expect(accepts(`2027-07-12${DATE_SLOT_VALUE_SEPARATOR}2027-02-30`, camp)).toBe(false);
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
    ).toEqual({ firstDay: '2027-07-12', lastDay: '2027-08-06', minDays: 3, maxDays: undefined });
  });

  it('offers nothing for a window longer than a year, which can only be a mistyped date', () => {
    expect(
      getSelectableDays({ startDate: camp.startDate, endDate: '2028-07-12T00:00:00.000Z' }),
    ).toBeUndefined();
    expect(
      accepts(`2028-01-10${DATE_SLOT_VALUE_SEPARATOR}2028-01-20`, {
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
