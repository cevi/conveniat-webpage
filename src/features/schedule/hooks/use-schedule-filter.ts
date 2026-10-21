'use client';

import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { isLogistics, timeOfDayOf } from '@/features/schedule/utils/programme-utils';
import type { FilterState } from '@/features/schedule/utils/schedule-filters';
import { noFilters } from '@/features/schedule/utils/schedule-filters';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

/**
 * Hiding Anreise and the meals is a standing preference, not a question of the moment like a
 * category, so the phone remembers it across visits. Only the way out of the default is stored.
 */
const logisticsStorageKey = 'schedule-hide-logistics';
const logisticsListeners = new Set<() => void>();

const subscribeToLogistics = (onChange: () => void): (() => void) => {
  logisticsListeners.add(onChange);
  globalThis.addEventListener('storage', onChange);
  return (): void => {
    logisticsListeners.delete(onChange);
    globalThis.removeEventListener('storage', onChange);
  };
};
const readHidesLogistics = (): boolean =>
  globalThis.localStorage.getItem(logisticsStorageKey) === 'true';
// the server has no stored choice, and the default shows the logistics
const readNoChoice = (): boolean => false;

const storeHidesLogistics = (hide: boolean): void => {
  if (hide) globalThis.localStorage.setItem(logisticsStorageKey, 'true');
  else globalThis.localStorage.removeItem(logisticsStorageKey);
  // the storage event only reaches other tabs
  for (const listener of logisticsListeners) listener();
};

/**
 * The search and the filters of the programme, applied to the entries of one day. The options
 * come from `allEntries`, so they stay put from day to day.
 */
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
  const [chosenFilters, setChosenFilters] = useState<FilterState>(noFilters);
  const hidesLogistics = useSyncExternalStore(
    subscribeToLogistics,
    readHidesLogistics,
    readNoChoice,
  );
  const filters = useMemo(
    () => ({ ...chosenFilters, showLogistics: !hidesLogistics }),
    [chosenFilters, hidesLogistics],
  );

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

      if (!filters.showLogistics && isLogistics(entry)) return false;

      if (filters.timesOfDay.length > 0) {
        const timeOfDay = timeOfDayOf(entry);
        if (timeOfDay === undefined || !filters.timesOfDay.includes(timeOfDay)) return false;
      }

      // Text search in title and description
      // a search of only spaces is no search
      const searchLower = filters.searchText.trim().toLowerCase();
      if (searchLower !== '') {
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

  const handleFiltersChange = useCallback(
    (newFilters: FilterState) => {
      setChosenFilters(newFilters);
      if (newFilters.showLogistics === hidesLogistics)
        storeHidesLogistics(!newFilters.showLogistics);
    },
    [hidesLogistics],
  );

  const clearFilters = useCallback(() => {
    setChosenFilters(noFilters);
    storeHidesLogistics(false);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText.trim() !== '' ||
      filters.selectedLocations.length > 0 ||
      filters.selectedCategory !== undefined ||
      filters.starredOnly ||
      filters.timesOfDay.length > 0 ||
      !filters.showLogistics
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
