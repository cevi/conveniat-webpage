'use client';

import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { FilterState } from '@/features/schedule/components/search-filter-bar';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import { useCallback, useMemo, useState } from 'react';

export const useScheduleFilters = (
  entries: CampScheduleEntryFrontendType[],
  starredIds: Set<string>,
  allEntries: CampScheduleEntryFrontendType[] = entries,
): {
  filters: FilterState;
  filteredEntries: CampScheduleEntryFrontendType[];
  availableLocations: CampMapAnnotation[];
  availableCategories: CampCategory[];
  hasActiveFilters: boolean;
  handleFiltersChange: (newFilters: FilterState) => void;
  clearFilters: () => void;
} => {
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    selectedLocations: [],
    selectedCategory: undefined,
    starredOnly: false,
  });

  // Extract unique locations and categories from all entries (not just the selected day's),
  // so the filter options stay stable on days whose entries carry no category or location
  const { availableLocations, availableCategories } = useMemo(() => {
    const locationMap = new Map<string, CampMapAnnotation>();
    const categoryMap = new Map<string, CampCategory>();

    for (const entry of allEntries) {
      // Extract location
      const location = resolveLocation(entry.location);
      if (location !== undefined && location.id !== '' && location.title !== '') {
        locationMap.set(location.id, location);
      }

      // Extract category
      if (typeof entry.category === 'object' && entry.category !== null) {
        categoryMap.set(entry.category.id, entry.category);
      }
    }

    return {
      availableLocations: [...locationMap.values()],
      availableCategories: [...categoryMap.values()],
    };
  }, [allEntries]);

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Starred filter
      if (filters.starredOnly && !starredIds.has(entry.id)) {
        return false;
      }

      // Text search in title and description
      if (filters.searchText !== '') {
        const searchLower = filters.searchText.toLowerCase();
        const titleMatch = entry.title.toLowerCase().includes(searchLower);

        // Search in description (assuming it's a rich text object)
        let descriptionMatch = false;
        if (typeof entry.description === 'object') {
          const descriptionText = convertLexicalToPlaintext({
            data: entry.description,
          }).toLowerCase();
          descriptionMatch = descriptionText.includes(searchLower);
        }

        if (!titleMatch && !descriptionMatch) {
          return false;
        }
      }

      // Location filter
      if (filters.selectedLocations.length > 0) {
        const entryLocation = resolveLocation(entry.location);
        const locationMatch =
          entryLocation !== undefined &&
          filters.selectedLocations.some(
            (selectedLocation) => selectedLocation.id === entryLocation.id,
          );
        if (!locationMatch) {
          return false;
        }
      }

      // Category filter
      if (filters.selectedCategory !== undefined) {
        const categoryId =
          typeof entry.category === 'object' && entry.category !== null
            ? entry.category.id
            : entry.category;

        if (categoryId !== filters.selectedCategory.id) {
          return false;
        }
      }

      return true;
    });
  }, [entries, filters, starredIds]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchText: '',
      selectedLocations: [],
      selectedCategory: undefined,
      starredOnly: false,
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText !== '' ||
      filters.selectedLocations.length > 0 ||
      filters.selectedCategory !== undefined ||
      filters.starredOnly
    );
  }, [filters]);

  return {
    filters,
    filteredEntries,
    availableLocations,
    availableCategories,
    hasActiveFilters,
    handleFiltersChange,
    clearFilters,
  };
};
