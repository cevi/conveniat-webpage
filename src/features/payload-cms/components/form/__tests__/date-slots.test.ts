import {
  DATE_SLOT_VALUE_SEPARATOR,
  generateDateSlots,
} from '@/features/payload-cms/components/form/utils/date-slots';

describe('generateDateSlots', () => {
  it('offers every three-day window that fits in the range', () => {
    const slots = generateDateSlots({
      startDate: '2027-07-24T00:00:00.000Z',
      endDate: '2027-07-28T00:00:00.000Z',
      slotLength: 3,
      stepDays: 1,
    });

    expect(slots.map((slot) => slot.value)).toEqual([
      `2027-07-24${DATE_SLOT_VALUE_SEPARATOR}2027-07-26`,
      `2027-07-25${DATE_SLOT_VALUE_SEPARATOR}2027-07-27`,
      `2027-07-26${DATE_SLOT_VALUE_SEPARATOR}2027-07-28`,
    ]);
  });

  it('offers back-to-back windows when the offset equals the slot length', () => {
    const slots = generateDateSlots({
      startDate: '2027-07-24T00:00:00.000Z',
      endDate: '2027-07-29T00:00:00.000Z',
      slotLength: 3,
      stepDays: 3,
    });

    expect(slots.map((slot) => slot.value)).toEqual([
      `2027-07-24${DATE_SLOT_VALUE_SEPARATOR}2027-07-26`,
      `2027-07-27${DATE_SLOT_VALUE_SEPARATOR}2027-07-29`,
    ]);
  });

  it('keeps the day the editor picked when the admin panel stored a local-midnight instant', () => {
    // 12.07.2027 picked in CEST (UTC+2) is stored as the previous day in UTC.
    const slots = generateDateSlots({
      startDate: '2027-07-11T22:00:00.000Z',
      endDate: '2027-07-13T22:00:00.000Z',
      slotLength: 3,
      stepDays: 1,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]?.startDate).toBe('2027-07-12');
    expect(slots[0]?.endDate).toBe('2027-07-14');
  });

  it('defaults to three-day windows one day apart', () => {
    const slots = generateDateSlots({
      startDate: '2027-07-24T00:00:00.000Z',
      endDate: '2027-07-27T00:00:00.000Z',
    });

    expect(slots.map((slot) => slot.value)).toEqual([
      `2027-07-24${DATE_SLOT_VALUE_SEPARATOR}2027-07-26`,
      `2027-07-25${DATE_SLOT_VALUE_SEPARATOR}2027-07-27`,
    ]);
  });

  it('offers nothing when the range is shorter than one slot', () => {
    expect(
      generateDateSlots({
        startDate: '2027-07-24T00:00:00.000Z',
        endDate: '2027-07-25T00:00:00.000Z',
        slotLength: 3,
      }),
    ).toEqual([]);
  });

  it('offers nothing for a half-filled block, as drafts skip field validation', () => {
    expect(generateDateSlots({})).toEqual([]);
    // eslint-disable-next-line unicorn/no-null
    expect(generateDateSlots({ startDate: '2027-07-24T00:00:00.000Z', endDate: null })).toEqual([]);
    expect(generateDateSlots({ startDate: 'not a date', endDate: 'neither' })).toEqual([]);
    expect(
      generateDateSlots({
        startDate: '2027-08-01T00:00:00.000Z',
        endDate: '2027-07-01T00:00:00.000Z',
      }),
    ).toEqual([]);
  });

  it('caps the list so a mistyped year cannot render a page full of cards', () => {
    const slots = generateDateSlots({
      startDate: '2027-07-24T00:00:00.000Z',
      endDate: '2999-07-24T00:00:00.000Z',
      slotLength: 3,
      stepDays: 1,
    });

    expect(slots.length).toBeLessThanOrEqual(200);
  });
});
