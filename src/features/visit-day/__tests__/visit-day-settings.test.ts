import { listVisitDayHoefe, toCampDay } from '@/features/visit-day/visit-day-settings';
import type { Payload } from 'payload';

const payloadWithHoefe = (
  hoefe: { id: string; name: string; quartier?: { id: string; name: string } }[],
): Payload =>
  ({
    find: jest.fn().mockResolvedValue({ docs: hoefe }),
  }) as unknown as Payload;

describe('listVisitDayHoefe', () => {
  it('offers the Höfe of the visiting Quartiere with their day, but no hidden Hof and none without a day', async () => {
    const payload = payloadWithHoefe([
      { id: 'uster', name: 'Cevi Uster', quartier: { id: 'q5', name: 'Quartier 5 - Greif' } },
      { id: 'zueri', name: 'Züri 11', quartier: { id: 'q1', name: 'Quartier 1 - Einhorn' } },
      { id: 'demo', name: 'Demo Hof für Testing', quartier: { id: 'q1', name: 'Quartier 1' } },
      { id: 'ohne', name: 'Hof ohne Quartier' },
      { id: 'andere', name: 'Hof im Quartier 9', quartier: { id: 'q9', name: 'Quartier 9' } },
    ]);

    const hoefe = await listVisitDayHoefe(payload, {
      days: [
        { date: '2027-07-28', capacity: 500, capacityWithoutLunch: 300, quartierIds: ['q5'] },
        { date: '2027-07-29', capacity: 500, capacityWithoutLunch: 300, quartierIds: ['q1'] },
      ],
      hiddenHofIds: new Set(['demo']),
    });

    expect(hoefe).toEqual([
      { id: 'uster', name: 'Cevi Uster', date: '2027-07-28' },
      { id: 'zueri', name: 'Züri 11', date: '2027-07-29' },
    ]);
  });
});

describe('toCampDay', () => {
  it('reads a day-only date in the camp timezone, so a date stored late in UTC keeps its day', () => {
    // midnight in Zurich is 22:00 UTC the day before during summer time
    expect(toCampDay('2027-07-27T22:00:00.000Z')).toBe('2027-07-28');
    expect(toCampDay('2027-07-28T10:00:00.000Z')).toBe('2027-07-28');
  });

  it('gives no day for a missing or malformed date', () => {
    expect(toCampDay(42)).toBeUndefined();
    expect(toCampDay('')).toBeUndefined();
  });
});
