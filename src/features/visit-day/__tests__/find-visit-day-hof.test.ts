import { findVisitDayHoefe } from '@/features/visit-day/find-visit-day-hof';

const hoefe = [
  { id: 'uster', name: 'Cevi Uster', date: '2027-07-28' },
  { id: 'zueri', name: 'Züri 11', date: '2027-07-29' },
  { id: 'wald', name: 'Cevi Wald ZH', date: '2027-07-29' },
];

describe('findVisitDayHoefe', () => {
  it('finds a Hof by any part of its name, whatever the case and accents', () => {
    expect(findVisitDayHoefe(hoefe, 'uster').map((hof) => hof.id)).toEqual(['uster']);
    expect(findVisitDayHoefe(hoefe, 'ZURI').map((hof) => hof.id)).toEqual(['zueri']);
  });

  it('needs every word of the search', () => {
    expect(findVisitDayHoefe(hoefe, 'cevi wald').map((hof) => hof.id)).toEqual(['wald']);
    expect(findVisitDayHoefe(hoefe, 'cevi').map((hof) => hof.id)).toEqual(['uster', 'wald']);
  });

  it('finds nothing for an empty search', () => {
    expect(findVisitDayHoefe(hoefe, '  ')).toEqual([]);
  });
});
