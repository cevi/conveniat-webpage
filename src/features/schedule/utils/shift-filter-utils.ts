import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import { resolveCategory } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import type { FilterState } from '@/features/schedule/utils/schedule-filters';

/**
 * Collects the distinct, populated categories used by the given shifts.
 *
 * Only categories that are actually in use are offered as filter options, mirroring the
 * behaviour of the camp schedule filters.
 */
export const extractShiftCategories = (shifts: HelperShiftFrontendType[]): CampCategory[] => {
  const categoryMap = new Map<string, CampCategory>();

  for (const shift of shifts) {
    const category = resolveCategory(shift.category);
    if (category !== undefined) {
      categoryMap.set(category.id, category);
    }
  }

  return [...categoryMap.values()];
};

/** The distinct places the given shifts happen at, to filter by. */
export const extractShiftLocations = (shifts: HelperShiftFrontendType[]): CampMapAnnotation[] => {
  const locationMap = new Map<string, CampMapAnnotation>();
  for (const shift of shifts) {
    const location = resolveLocation(shift.location);
    if (location !== undefined) locationMap.set(location.id, location);
  }
  return [...locationMap.values()];
};

/**
 * Applies the free-text search, the selected category and the selected places to the given
 * shifts.
 */
export const filterShifts = (
  shifts: HelperShiftFrontendType[],
  filters: FilterState,
): HelperShiftFrontendType[] => {
  return shifts.filter((shift) => {
    // Text search in title and description
    if (filters.searchText !== '') {
      const searchLower = filters.searchText.toLowerCase();
      const titleMatch = shift.title.toLowerCase().includes(searchLower);
      const descriptionMatch = shift.description.toLowerCase().includes(searchLower);

      if (!titleMatch && !descriptionMatch) {
        return false;
      }
    }

    // Category filter
    if (filters.selectedCategory !== undefined) {
      const categoryId = resolveCategory(shift.category)?.id ?? shift.category;

      if (categoryId !== filters.selectedCategory.id) {
        return false;
      }
    }

    // Place filter: any of the chosen places
    if (filters.selectedLocations.length > 0) {
      const locationId = resolveLocation(shift.location)?.id;
      if (!filters.selectedLocations.some(({ id }) => id === locationId)) {
        return false;
      }
    }

    return true;
  });
};
