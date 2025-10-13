import type React from 'react';
import { useCallback } from 'react';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';

const searchPlaceholder: StaticTranslationString = {
  de: 'Nach Titel oder Beschreibung suchen...',
  en: 'Search by title or description...',
  fr: 'Rechercher par titre ou description...',
};

const clearAllText: StaticTranslationString = {
  de: 'Suche Zurücksetzen',
  en: 'Reset search',
  fr: 'Réinitialiser la recherche',
};

export interface FilterState {
  searchText: string;
  selectedLocations: CampMapAnnotation[];
  selectedCategory: string;
}

interface SearchFilterBarProperties {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableLocations: CampMapAnnotation[];
  availableCategories: string[];
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProperties> = ({
  filters,
  onFiltersChange,
  className = '',
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        searchText: value,
      });
    },
    [filters, onFiltersChange],
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      searchText: '',
      selectedLocations: [],
      selectedCategory: '',
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.searchText !== '' ||
    filters.selectedLocations.length > 0 ||
    filters.selectedCategory !== '';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <AppSearchBar
        placeholder={searchPlaceholder[locale]}
        value={filters.searchText}
        onChange={(event) => handleSearchChange(event.target.value)}
      />
      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 border">
          <X className="mr-2 h-4 w-4" />
          {clearAllText[locale]}
        </Button>
      )}
    </div>
  );
};
