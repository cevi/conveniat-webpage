import type { CampCategory } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import type { FilterState } from '@/features/schedule/components/search-filter-bar';
import { extractShiftCategories, filterShifts } from '@/features/schedule/utils/shift-filter-utils';

const kitchen = {
  id: 'cat-kitchen',
  title: 'Küche',
  colorTheme: 'green',
} as CampCategory;

const cleaning = {
  id: 'cat-cleaning',
  title: 'Reinigung',
  colorTheme: 'blue',
} as CampCategory;

const makeShift = (
  overrides: Partial<HelperShiftFrontendType> & { id: string },
): HelperShiftFrontendType => ({
  title: 'Some Shift',
  description: 'Some description',
  timeslot: { date: '2027-07-24', time: '08:00 - 12:00' },
  ...overrides,
});

const noFilters: FilterState = {
  searchText: '',
  selectedLocations: [],
  selectedCategory: undefined,
  starredOnly: false,
};

describe('extractShiftCategories', () => {
  it('returns each populated category exactly once', () => {
    const shifts = [
      makeShift({ id: 'a', category: kitchen }),
      makeShift({ id: 'b', category: kitchen }),
      makeShift({ id: 'c', category: cleaning }),
    ];

    expect(extractShiftCategories(shifts)).toEqual([kitchen, cleaning]);
  });

  it('ignores unpopulated, missing and dangling categories', () => {
    const shifts = [
      makeShift({ id: 'a', category: 'cat-kitchen' }),
      makeShift({ id: 'b', category: undefined }),
      // eslint-disable-next-line unicorn/no-null -- Payload returns null for dangling relationships
      makeShift({ id: 'c', category: null }),
    ];

    expect(extractShiftCategories(shifts)).toEqual([]);
  });
});

describe('filterShifts', () => {
  const shifts = [
    makeShift({ id: 'a', title: 'Küchendienst', category: kitchen }),
    makeShift({ id: 'b', title: 'Putzdienst', description: 'Zelte reinigen', category: cleaning }),
    makeShift({ id: 'c', title: 'Nachtwache' }),
  ];

  it('returns all shifts when no filter is active', () => {
    expect(filterShifts(shifts, noFilters)).toHaveLength(3);
  });

  it('filters by the selected category', () => {
    const filtered = filterShifts(shifts, {
      ...noFilters,
      selectedCategory: { id: cleaning.id, title: cleaning.title },
    });

    expect(filtered.map((shift) => shift.id)).toEqual(['b']);
  });

  it('matches unpopulated category relationships by id', () => {
    const filtered = filterShifts([makeShift({ id: 'd', category: 'cat-kitchen' })], {
      ...noFilters,
      selectedCategory: { id: kitchen.id, title: kitchen.title },
    });

    expect(filtered.map((shift) => shift.id)).toEqual(['d']);
  });

  it('searches case-insensitively in title and description', () => {
    expect(filterShifts(shifts, { ...noFilters, searchText: 'küchen' })).toHaveLength(1);
    expect(filterShifts(shifts, { ...noFilters, searchText: 'ZELTE' })).toHaveLength(1);
    expect(filterShifts(shifts, { ...noFilters, searchText: 'nothing' })).toHaveLength(0);
  });

  it('combines search and category filters', () => {
    const filtered = filterShifts(shifts, {
      ...noFilters,
      searchText: 'dienst',
      selectedCategory: { id: kitchen.id, title: kitchen.title },
    });

    expect(filtered.map((shift) => shift.id)).toEqual(['a']);
  });
});
