/**
 * @jest-environment jsdom
 */

import { sortRows, useTableSort } from '@/features/hof-dashboard/hooks/use-table-sort';
import { act, renderHook } from '@testing-library/react';

const HOEFE = [
  { name: 'Uster', rope: 20 },
  { name: 'Züri 11', rope: 60 },
  { name: 'Bülach', rope: 20 },
  { name: 'Aathal Seegräben', rope: 5 },
];

const valueOf = (hof: (typeof HOEFE)[number], key: 'name' | 'rope'): number | string =>
  key === 'name' ? hof.name : hof.rope;

describe('useTableSort', () => {
  it('sorts ascending, then descending, then returns to the original order', () => {
    const { result } = renderHook(() => useTableSort<'name' | 'rope'>());
    expect(result.current.sort).toBeUndefined();

    act(() => result.current.toggle('rope'));
    expect(result.current.sort).toEqual({ key: 'rope', direction: 'ascending' });
    act(() => result.current.toggle('rope'));
    expect(result.current.sort).toEqual({ key: 'rope', direction: 'descending' });
    act(() => result.current.toggle('rope'));
    expect(result.current.sort).toBeUndefined();
  });

  it('starts ascending again on another column', () => {
    const { result } = renderHook(() => useTableSort<'name' | 'rope'>());
    act(() => result.current.toggle('rope'));
    act(() => result.current.toggle('rope'));
    act(() => result.current.toggle('name'));
    expect(result.current.sort).toEqual({ key: 'name', direction: 'ascending' });
  });
});

describe('sortRows', () => {
  it('keeps the rows as they came without a sort', () => {
    expect(sortRows(HOEFE, undefined, valueOf, 'de').map((hof) => hof.name)).toEqual([
      'Uster',
      'Züri 11',
      'Bülach',
      'Aathal Seegräben',
    ]);
  });

  it('sorts numbers by size, and rows that tie keep their order', () => {
    expect(
      sortRows(HOEFE, { key: 'rope', direction: 'descending' }, valueOf, 'de').map(
        (hof) => hof.name,
      ),
    ).toEqual(['Züri 11', 'Uster', 'Bülach', 'Aathal Seegräben']);
  });

  it("sorts names as the reader's language orders them", () => {
    expect(
      sortRows(HOEFE, { key: 'name', direction: 'ascending' }, valueOf, 'de').map(
        (hof) => hof.name,
      ),
    ).toEqual(['Aathal Seegräben', 'Bülach', 'Uster', 'Züri 11']);
  });
});
