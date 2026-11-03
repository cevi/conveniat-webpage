import { findVisitDayHoefe } from '@/features/visit-day/find-visit-day-hof';

const hoefe = [
  { id: 'uster', name: 'Uster', date: '2027-07-28' },
  { id: 'zueri', name: 'Züri 11', date: '2027-07-29' },
  { id: 'thalwil', name: 'Thalwil + Wädenswil + Hirzel + March', date: '2027-07-29' },
  { id: 'bubendorf', name: 'Jungschar Bubendorf', date: '2027-07-28' },
];

const ids = (search: string): string[] => findVisitDayHoefe(hoefe, search).map((hof) => hof.id);

describe('findVisitDayHoefe', () => {
  it('finds a Hof by any of its Abteilungen, whatever the case and accents', () => {
    expect(ids('wadenswil')).toEqual(['thalwil']);
    expect(ids('ZÜRI')).toEqual(['zueri']);
  });

  it('ignores the "Cevi" relatives put before the Abteilung', () => {
    expect(ids('Cevi Uster')).toEqual(['uster']);
    expect(ids('Abteilung Hirzel')).toEqual(['thalwil']);
  });

  it('needs every other word of the search', () => {
    expect(ids('jungschar bubendorf')).toEqual(['bubendorf']);
    expect(ids('jungschar uster')).toEqual([]);
  });

  it('finds nothing for an empty search, or one of ignored words only', () => {
    expect(ids('  ')).toEqual([]);
    expect(ids('Cevi')).toEqual([]);
  });
});
