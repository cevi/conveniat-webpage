import type { CampCategory } from '@/features/payload-cms/payload-types';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import type { FilterState } from '@/features/schedule/components/search-filter-bar';
import { resolveCategory } from '@/features/schedule/utils/category-utils';

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

/**
 * Applies the free-text search and the selected category to the given shifts.
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

    return true;
  });
};
