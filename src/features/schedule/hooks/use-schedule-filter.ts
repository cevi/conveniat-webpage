'use client';

import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { FilterState } from '@/features/schedule/components/search-filter-bar';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import { useCallback, useMemo, useState } from 'react';

export const useScheduleFilters = (
  entries: CampScheduleEntryFrontendType[],
): {
  filters: FilterState;
  filteredEntries: CampScheduleEntryFrontendType[];
  availableLocations: CampMapAnnotation[];
  availableCategories: string[];
  hasActiveFilters: boolean;
  handleFiltersChange: (newFilters: FilterState) => void;
  clearFilters: () => void;
} => {
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    selectedLocations: [],
    selectedCategory: '',
  });

  // Extract unique locations and categories from entries
  const { availableLocations, availableCategories } = useMemo(() => {
    const locationMap = new Map<string, CampMapAnnotation>();
    const categorySet = new Set<string>();

    for (const entry of entries) {
      // Extract location
      const location = entry.location as CampMapAnnotation;
      if (location.id !== '' && location.title !== '') {
        locationMap.set(location.id, location);
      }

      // Extract category (prepare for future category field)
      if (entry.category != undefined) {
        categorySet.add(entry.category);
      }
    }

    return {
      availableLocations: [...locationMap.values()],
      availableCategories: [...categorySet],
    };
  }, [entries]);

  // Filter entries based on current filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
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
        const entryLocation = entry.location as CampMapAnnotation;
        const locationMatch = filters.selectedLocations.some(
          (selectedLocation) => selectedLocation.id === entryLocation.id,
        );
        if (!locationMatch) {
          return false;
        }
      }

      // Category filter (prepare for future category field)
      return !(
        filters.selectedCategory !== '' &&
        (entry.category == undefined || entry.category !== filters.selectedCategory)
      );
    });
  }, [entries, filters]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchText: '',
      selectedLocations: [],
      selectedCategory: '',
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText !== '' ||
      filters.selectedLocations.length > 0 ||
      filters.selectedCategory !== ''
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
