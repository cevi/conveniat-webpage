/**
 * @jest-environment jsdom
 */

import type { CampCategory } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import { useShiftFilters } from '@/features/schedule/hooks/use-shift-filter';
import { act, renderHook } from '@testing-library/react';

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
  organiser: [],
  ...overrides,
});

describe('useShiftFilters', () => {
  const shiftsOfDay = [makeShift({ id: 'a', title: 'Aufbau Stände' })];
  const allShifts = [
    ...shiftsOfDay,
    makeShift({
      id: 'b',
      title: 'Foto-/Videograph:in',
      timeslot: { date: '2027-07-25', time: '08:00 - 12:00' },
      category: kitchen,
    }),
    makeShift({
      id: 'c',
      title: 'Escape Room betreuen',
      timeslot: { date: '2027-07-26', time: '08:00 - 12:00' },
      category: cleaning,
    }),
  ];

  it('offers categories from all shifts even when the displayed day has none', () => {
    const { result } = renderHook(() => useShiftFilters(shiftsOfDay, allShifts));

    expect(result.current.availableCategories).toEqual([kitchen, cleaning]);
    expect(result.current.filteredShifts).toEqual(shiftsOfDay);
  });

  it('falls back to the displayed shifts as category source', () => {
    const { result } = renderHook(() => useShiftFilters(shiftsOfDay));

    expect(result.current.availableCategories).toEqual([]);
  });

  it('only filters the displayed shifts, not the category source', () => {
    const { result } = renderHook(() => useShiftFilters(shiftsOfDay, allShifts));

    act(() => {
      result.current.handleFiltersChange({
        searchText: '',
        selectedLocations: [],
        selectedCategory: { id: kitchen.id, title: kitchen.title },
        starredOnly: false,
      });
    });

    expect(result.current.filteredShifts).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filteredShifts).toEqual(shiftsOfDay);
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
