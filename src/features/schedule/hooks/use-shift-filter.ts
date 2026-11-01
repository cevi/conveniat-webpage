'use client';

import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import type { FilterState } from '@/features/schedule/utils/schedule-filters';
import { noFilters } from '@/features/schedule/utils/schedule-filters';
import {
  extractShiftCategories,
  extractShiftLocations,
  filterShifts,
} from '@/features/schedule/utils/shift-filter-utils';
import { useCallback, useMemo, useState } from 'react';

/**
 * Search, category and place filtering for helper shifts.
 *
 * Mirrors {@link useScheduleFilters} so the helper portal behaves like the camp schedule;
 * helper shifts cannot be starred, hence the starred filter is left untouched.
 *
 * The filter options are derived from `allShifts` (typically every shift across all days) so
 * that the category list does not disappear on days whose shifts carry no category, while the
 * filtering itself only applies to `shifts` (typically the shifts of the selected day).
 */
export const useShiftFilters = (
  shifts: HelperShiftFrontendType[],
  allShifts: HelperShiftFrontendType[] = shifts,
): {
  filters: FilterState;
  filteredShifts: HelperShiftFrontendType[];
  availableCategories: CampCategory[];
  availableLocations: CampMapAnnotation[];
  hasActiveFilters: boolean;
  handleFiltersChange: (newFilters: FilterState) => void;
  clearFilters: () => void;
} => {
  const [filters, setFilters] = useState<FilterState>(noFilters);

  const availableCategories = useMemo(() => extractShiftCategories(allShifts), [allShifts]);
  const availableLocations = useMemo(() => extractShiftLocations(allShifts), [allShifts]);

  const filteredShifts = useMemo(() => filterShifts(shifts, filters), [shifts, filters]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(noFilters);
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      filters.searchText !== '' ||
      filters.selectedCategory !== undefined ||
      filters.selectedLocations.length > 0,
    [filters],
  );

  return {
    filters,
    filteredShifts,
    availableCategories,
    availableLocations,
    hasActiveFilters,
    handleFiltersChange,
    clearFilters,
  };
};
