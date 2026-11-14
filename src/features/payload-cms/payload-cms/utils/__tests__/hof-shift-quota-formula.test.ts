import {
  DEFAULT_DISTRIBUTION_SETTINGS,
  distributeQuotas,
} from '@/features/payload-cms/payload-cms/utils/hof-shift-quota-formula';

const days = ['2027-07-26', '2027-07-27', '2027-07-28', '2027-07-29', '2027-07-30'];
const hoefe = [
  { id: 'uster', leaders: 38 },
  { id: 'zueri11', leaders: 24 },
  { id: 'wil', leaders: 12 },
  { id: 'bern', leaders: 45 },
  { id: 'waedenswil', leaders: 9 },
];
const placesPerDay = Object.fromEntries(days.map((day, index) => [day, 20 + index * 3]));

const sumOfDay = (result: Record<string, Record<string, number>>, day: string): number =>
  Object.values(result).reduce((sum, ofHof) => sum + (ofHof[day] ?? 0), 0);
const totalOf = (result: Record<string, Record<string, number>>, hofId: string): number =>
  Object.values(result[hofId] ?? {}).reduce((sum, value) => sum + value, 0);

describe('distributeQuotas', () => {
  it('covers every place of every day', () => {
    const result = distributeQuotas({
      days,
      hoefe,
      placesPerDay,
      pinned: {},
      settings: DEFAULT_DISTRIBUTION_SETTINGS,
    });
    for (const day of days) expect(sumOfDay(result, day)).toBe(placesPerDay[day]);
  });

  it('gives every Hof the same share of its Leitende when strictly proportional', () => {
    const result = distributeQuotas({
      days,
      hoefe,
      placesPerDay,
      pinned: {},
      settings: { ...DEFAULT_DISTRIBUTION_SETTINGS, weightingPercent: 100 },
    });
    const places = Object.values(placesPerDay).reduce((sum, value) => sum + value, 0);
    const leaders = hoefe.reduce((sum, hof) => sum + hof.leaders, 0);
    for (const hof of hoefe) {
      // rounding carried from day to day keeps the camp total within one of the fair share
      expect(Math.abs(totalOf(result, hof.id) - (places * hof.leaders) / leaders)).toBeLessThan(
        1.01,
      );
    }
  });

  it('lets a big Hof give a smaller share of its Leitende when evened out', () => {
    const result = distributeQuotas({
      days,
      hoefe,
      placesPerDay,
      pinned: {},
      settings: { ...DEFAULT_DISTRIBUTION_SETTINGS, weightingPercent: 50 },
    });
    const shareOf = (id: string, leaders: number): number => totalOf(result, id) / leaders;
    expect(shareOf('bern', 45)).toBeLessThan(shareOf('waedenswil', 9));
  });

  it('keeps a pinned cell and spreads the rest of the day around it', () => {
    const result = distributeQuotas({
      days,
      hoefe,
      placesPerDay,
      pinned: { wil: { '2027-07-26': 0 }, bern: { '2027-07-26': 10 } },
      settings: DEFAULT_DISTRIBUTION_SETTINGS,
    });
    expect(result['wil']?.['2027-07-26']).toBe(0);
    expect(result['bern']?.['2027-07-26']).toBe(10);
    expect(sumOfDay(result, '2027-07-26')).toBe(placesPerDay['2027-07-26']);
  });

  it('never asks a Hof for more than the most it gives on one day', () => {
    const result = distributeQuotas({
      days: ['2027-07-26'],
      hoefe: [
        { id: 'small', leaders: 10 },
        { id: 'big', leaders: 100 },
      ],
      placesPerDay: { '2027-07-26': 30 },
      pinned: {},
      settings: { ...DEFAULT_DISTRIBUTION_SETTINGS, weightingPercent: 0 },
    });
    // evenly split would be 15 each, but the small Hof gives at most 3 of its 10
    expect(result['small']?.['2027-07-26']).toBe(3);
    expect(result['big']?.['2027-07-26']).toBe(27);
  });

  it('leaves places open when the Höfe are full, rather than going over their caps', () => {
    const result = distributeQuotas({
      days: ['2027-07-26'],
      hoefe: [{ id: 'only', leaders: 10 }],
      placesPerDay: { '2027-07-26': 30 },
      pinned: {},
      settings: DEFAULT_DISTRIBUTION_SETTINGS,
    });
    expect(result['only']?.['2027-07-26']).toBe(3);
  });

  it('plans a reserve above the places with a coverage over 100', () => {
    const result = distributeQuotas({
      days: ['2027-07-26'],
      hoefe,
      placesPerDay: { '2027-07-26': 20 },
      pinned: {},
      settings: { ...DEFAULT_DISTRIBUTION_SETTINGS, coveragePercent: 110 },
    });
    expect(sumOfDay(result, '2027-07-26')).toBe(22);
  });

  it('asks nothing of a Hof without Leitende', () => {
    const result = distributeQuotas({
      days: ['2027-07-26'],
      hoefe: [...hoefe, { id: 'empty', leaders: 0 }],
      placesPerDay: { '2027-07-26': 20 },
      pinned: {},
      settings: DEFAULT_DISTRIBUTION_SETTINGS,
    });
    expect(result['empty']?.['2027-07-26']).toBe(0);
  });
});
