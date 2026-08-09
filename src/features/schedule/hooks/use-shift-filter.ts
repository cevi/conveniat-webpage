'use client';

import type { CampCategory } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import type { FilterState } from '@/features/schedule/components/search-filter-bar';
import { extractShiftCategories, filterShifts } from '@/features/schedule/utils/shift-filter-utils';
import { useCallback, useMemo, useState } from 'react';

const emptyFilters: FilterState = {
  searchText: '',
  selectedLocations: [],
  selectedCategory: undefined,
  starredOnly: false,
};

/**
 * Search and category filtering for helper shifts.
 *
 * Mirrors {@link useScheduleFilters} so the helper portal behaves like the camp schedule;
 * helper shifts cannot be starred, hence the starred filter is left untouched.
 */
export const useShiftFilters = (
  shifts: HelperShiftFrontendType[],
): {
  filters: FilterState;
  filteredShifts: HelperShiftFrontendType[];
  availableCategories: CampCategory[];
  hasActiveFilters: boolean;
  handleFiltersChange: (newFilters: FilterState) => void;
  clearFilters: () => void;
} => {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  const availableCategories = useMemo(() => extractShiftCategories(shifts), [shifts]);

  const filteredShifts = useMemo(() => filterShifts(shifts, filters), [shifts, filters]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters);
  }, []);

  const hasActiveFilters = useMemo(
    () => filters.searchText !== '' || filters.selectedCategory !== undefined,
    [filters],
  );

  return {
    filters,
    filteredShifts,
    availableCategories,
    hasActiveFilters,
    handleFiltersChange,
    clearFilters,
  };
};
