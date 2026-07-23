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
  de: 'Suchen...',
  en: 'Search...',
  fr: 'Rechercher...',
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
    (category?: { id: string; title: string }) => {
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
    <div className={`space-y-2 ${className}`}>
      {/* Search Input with Filter and Starred Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <AppSearchBar
            placeholder={searchPlaceholder[locale]}
            value={filters.searchText}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="h-10 text-xs"
          />
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategoryFilter(!showCategoryFilter)}
          className={cn(
            'font-heading h-10 shrink-0 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-all duration-200',
            showCategoryFilter || hasCategoryFilter
              ? 'border-transparent bg-gray-900 text-white shadow-xs'
              : 'border-gray-100 bg-white text-gray-700 shadow-2xs hover:border-gray-200 hover:bg-gray-50',
          )}
          aria-label="Filter by category"
        >
          <Filter
            className={cn(
              'h-4 w-4',
              showCategoryFilter || hasCategoryFilter ? 'text-white' : 'text-gray-500',
            )}
          />
          <span className="hidden sm:inline">Filter</span>
          {hasCategoryFilter && (
            <span
              className={cn(
                'flex h-2 w-2 rounded-full',
                showCategoryFilter || hasCategoryFilter ? 'bg-emerald-400' : 'bg-conveniat-green',
              )}
            />
          )}
        </Button>

        {/* Starred Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFiltersChange({ ...filters, starredOnly: !filters.starredOnly })}
          className={cn(
            'font-heading h-10 shrink-0 cursor-pointer rounded-xl px-3 text-xs font-semibold transition-all duration-200',
            filters.starredOnly
              ? 'border-transparent bg-gray-900 text-white shadow-xs'
              : 'border-gray-100 bg-white text-gray-700 shadow-2xs hover:border-gray-200 hover:bg-gray-50',
          )}
          aria-label={starredOnlyText[locale]}
        >
          <Star
            className={cn(
              'h-4 w-4',
              filters.starredOnly ? 'fill-amber-400 text-amber-400' : 'text-gray-500',
            )}
          />
          <span className="hidden sm:inline">{starredOnlyText[locale]}</span>
        </Button>
      </div>

      {/* Category Filter Dropdown */}
      {showCategoryFilter && (
        <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-2.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs duration-200">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-semibold tracking-wider text-gray-500 uppercase">
              {allCategoriesText[locale]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryChange()}
              className={cn(
                'cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                filters.selectedCategory === undefined
                  ? 'bg-conveniat-green text-white shadow-xs'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100',
              )}
            >
              {allCategoriesText[locale]}
            </button>
            {availableCategories.map((category) => {
              const isSelected = filters.selectedCategory?.id === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange({ id: category.id, title: category.title })}
                  className={cn(
                    'cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                    isSelected
                      ? 'bg-conveniat-green text-white shadow-xs'
                      : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100',
                  )}
                >
                  {category.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Filters / Clear */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {/* Show selected category as a chip */}
          {hasCategoryFilter && filters.selectedCategory && (
            <span className="animate-in fade-in flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-2xs">
              {filters.selectedCategory.title}
              <button
                type="button"
                onClick={() => handleCategoryChange()}
                className="cursor-pointer rounded-full p-0.5 text-emerald-700 transition-colors hover:bg-emerald-200/50"
                aria-label="Filter entfernen"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Clear All Filters */}
          <button
            type="button"
            onClick={clearAllFilters}
            className="font-body hover:text-conveniat-green inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-gray-500 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {clearAllText[locale]}
          </button>
        </div>
      )}
    </div>
  );
};
