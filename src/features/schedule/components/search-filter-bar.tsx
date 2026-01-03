'use client';

import type React from 'react';
import { useCallback, useState } from 'react';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Filter, Star, X } from 'lucide-react';
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

const starredOnlyText: StaticTranslationString = {
  de: 'Nur Favoriten',
  en: 'Favorites only',
  fr: 'Favoris seulement',
};

const allCategoriesText: StaticTranslationString = {
  de: 'Alle Kategorien',
  en: 'All Categories',
  fr: 'Toutes les catégories',
};

export interface FilterState {
  searchText: string;
  selectedLocations: CampMapAnnotation[];
  selectedCategory: { id: string; title: string } | undefined;
  starredOnly: boolean;
}

interface SearchFilterBarProperties {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableLocations: CampMapAnnotation[];
  availableCategories: CampCategory[];
  className?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProperties> = ({
  filters,
  onFiltersChange,
  availableCategories,
  className = '',
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        searchText: value,
      });
    },
    [filters, onFiltersChange],
  );

  const handleCategoryChange = useCallback(
    (category: { id: string; title: string } | undefined) => {
      onFiltersChange({
        ...filters,
        selectedCategory: category,
      });
      setShowCategoryFilter(false);
    },
    [filters, onFiltersChange],
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      searchText: '',
      selectedLocations: [],
      selectedCategory: undefined,
      starredOnly: false,
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.searchText !== '' ||
    filters.selectedLocations.length > 0 ||
    filters.selectedCategory !== undefined ||
    filters.starredOnly;

  const hasCategoryFilter = filters.selectedCategory !== undefined;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input with Filter and Starred Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 transition-all duration-300 ease-out">
          <AppSearchBar
            placeholder={searchPlaceholder[locale]}
            value={filters.searchText}
            onChange={(event) => handleSearchChange(event.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={cn(
              'transition-all duration-200',
              isSearchFocused && 'ring-conveniat-green/20 ring-2',
            )}
          />
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowCategoryFilter(!showCategoryFilter)}
          className={cn(
            'h-12 w-12 shrink-0 rounded-lg border-gray-200 transition-all duration-200',
            showCategoryFilter || hasCategoryFilter
              ? 'border-conveniat-green bg-conveniat-green/10 text-conveniat-green'
              : 'bg-white text-gray-700 hover:bg-gray-50',
            isSearchFocused && 'w-0 overflow-hidden border-0 p-0 opacity-0',
          )}
          aria-label="Filter by category"
        >
          <Filter className="h-5 w-5" />
        </Button>

        {/* Starred Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onFiltersChange({ ...filters, starredOnly: !filters.starredOnly })}
          className={cn(
            'h-12 w-12 shrink-0 rounded-lg border-gray-200 transition-all duration-200',
            filters.starredOnly
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'bg-white text-gray-700 hover:bg-gray-50',
            isSearchFocused && 'w-0 overflow-hidden border-0 p-0 opacity-0',
          )}
          aria-label={starredOnlyText[locale]}
        >
          <Star className={cn('h-5 w-5', filters.starredOnly && 'fill-red-400 text-red-600')} />
        </Button>
      </div>

      {/* Category Filter Dropdown */}
      {showCategoryFilter && (
        <div className="animate-in fade-in slide-in-from-top-2 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm duration-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCategoryChange()}
            className={cn(
              'h-8 rounded-full px-3 text-sm',
              filters.selectedCategory === undefined && 'bg-gray-100 font-medium',
            )}
          >
            {allCategoriesText[locale]}
          </Button>
          {availableCategories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              size="sm"
              onClick={() => handleCategoryChange({ id: category.id, title: category.title })}
              className={cn(
                'h-8 rounded-full px-3 text-sm',
                filters.selectedCategory?.id === category.id &&
                  'bg-conveniat-green/10 text-conveniat-green font-medium',
              )}
            >
              {category.title}
            </Button>
          ))}
        </div>
      )}

      {/* Active Filters / Clear */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Show selected category as a chip */}
        {hasCategoryFilter && filters.selectedCategory && (
          <span className="animate-in fade-in border-conveniat-green/30 bg-conveniat-green/10 text-conveniat-green flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium">
            {filters.selectedCategory.title}
            <button
              onClick={() => handleCategoryChange()}
              className="cursor-pointer hover:bg-conveniat-green/20 ml-1 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-gray-500 hover:text-gray-700"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            {clearAllText[locale]}
          </Button>
        )}
      </div>
    </div>
  );
};
