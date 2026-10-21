'use client';

import type React from 'react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/buttons/button';
import { SectionLabel } from '@/components/ui/section-label';
import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, ListFilter, Search, Star, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';

const labels = {
  search: { de: 'Suchen …', en: 'Search …', fr: 'Rechercher …' },
  clearSearch: { de: 'Suche leeren', en: 'Clear search', fr: 'Effacer la recherche' },
  filter: { de: 'Filter', en: 'Filters', fr: 'Filtres' },
  activeFilters: {
    de: '{{count}} aktive Filter',
    en: '{{count}} active filters',
    fr: '{{count}} filtres actifs',
  },
  favourites: { de: 'Favoriten', en: 'Favourites', fr: 'Favoris' },
  category: { de: 'Kategorie', en: 'Category', fr: 'Catégorie' },
  allCategories: { de: 'Alle Kategorien', en: 'All categories', fr: 'Toutes les catégories' },
  place: { de: 'Ort', en: 'Place', fr: 'Lieu' },
  places: { de: '{{count}} Orte', en: '{{count}} places', fr: '{{count}} lieux' },
  allPlaces: { de: 'Alle Orte', en: 'All places', fr: 'Tous les lieux' },
  resetAll: { de: 'Alle zurücksetzen', en: 'Reset all', fr: 'Tout réinitialiser' },
  done: { de: 'Fertig', en: 'Done', fr: 'OK' },
} satisfies Record<string, StaticTranslationString>;

export interface FilterState {
  searchText: string;
  selectedLocations: CampMapAnnotation[];
  selectedCategory: { id: string; title: string } | undefined;
  starredOnly: boolean;
}

const noFilters: FilterState = {
  searchText: '',
  selectedLocations: [],
  selectedCategory: undefined,
  starredOnly: false,
};

type Panel = 'all' | 'category' | 'place';

interface SearchFilterBarProperties {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableLocations?: CampMapAnnotation[];
  availableCategories: CampCategory[];
  /** Helper shifts cannot be starred, so they leave the favourites out. */
  showStarredToggle?: boolean;
  /** the search button in the app header opens the search field */
  isSearchOpen: boolean;
  className?: string;
}

const chipClassName = (isActive: boolean): string =>
  cn(
    'flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold whitespace-nowrap transition-colors',
    isActive
      ? 'bg-conveniat-green border-conveniat-green text-white'
      : 'border-line bg-white text-green-900 hover:border-green-300',
  );

/** One option in a panel: a pill that is pressed while it is chosen. */
const OptionPill: React.FC<{
  label: string;
  isChosen: boolean;
  onClick: () => void;
}> = ({ label, isChosen, onClick }) => (
  <button
    type="button"
    aria-pressed={isChosen}
    onClick={onClick}
    className={cn(
      'min-h-11 cursor-pointer rounded-full border px-3.5 text-sm font-semibold transition-colors',
      isChosen
        ? 'bg-conveniat-green border-conveniat-green text-white'
        : 'border-line bg-white text-green-900 hover:border-green-300',
    )}
  >
    {label}
  </button>
);

/**
 * The search field, opened from the header, and the filters as a row of chips under it: all
 * filters at once, the favourites, the category and the place. A chip says what it filters by
 * while it does; its choices open in place below the row, never over the page.
 */
export const SearchFilterBar: React.FC<SearchFilterBarProperties> = ({
  filters,
  onFiltersChange,
  availableLocations = [],
  availableCategories,
  showStarredToggle = true,
  isSearchOpen,
  className,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [openPanel, setOpenPanel] = useState<Panel>();

  const update = useCallback(
    (change: Partial<FilterState>): void => onFiltersChange({ ...filters, ...change }),
    [filters, onFiltersChange],
  );
  const toggle = (panel: Panel): void =>
    setOpenPanel((current) => (current === panel ? undefined : panel));

  const isPlaceChosen = (place: CampMapAnnotation): boolean =>
    filters.selectedLocations.some(({ id }) => id === place.id);
  const togglePlace = (place: CampMapAnnotation): void =>
    update({
      selectedLocations: isPlaceChosen(place)
        ? filters.selectedLocations.filter(({ id }) => id !== place.id)
        : [...filters.selectedLocations, place],
    });

  const activeCount =
    (filters.selectedCategory === undefined ? 0 : 1) +
    (filters.selectedLocations.length > 0 ? 1 : 0) +
    (filters.starredOnly ? 1 : 0);

  let placeLabel = labels.place[locale];
  if (filters.selectedLocations.length === 1) {
    placeLabel = filters.selectedLocations[0]?.title ?? placeLabel;
  }
  if (filters.selectedLocations.length > 1) {
    placeLabel = labels.places[locale].replace(
      '{{count}}',
      String(filters.selectedLocations.length),
    );
  }

  const categoryOptions = (
    <div className="flex flex-wrap gap-2">
      <OptionPill
        label={labels.allCategories[locale]}
        isChosen={filters.selectedCategory === undefined}
        onClick={() => {
          update({ selectedCategory: undefined });
          if (openPanel === 'category') setOpenPanel(undefined);
        }}
      />
      {availableCategories.map((category) => (
        <OptionPill
          key={category.id}
          label={category.title}
          isChosen={filters.selectedCategory?.id === category.id}
          onClick={() => {
            update({ selectedCategory: { id: category.id, title: category.title } });
            if (openPanel === 'category') setOpenPanel(undefined);
          }}
        />
      ))}
    </div>
  );

  const placeOptions = (
    <div className="flex flex-wrap gap-2">
      <OptionPill
        label={labels.allPlaces[locale]}
        isChosen={filters.selectedLocations.length === 0}
        onClick={() => update({ selectedLocations: [] })}
      />
      {availableLocations.map((place) => (
        <OptionPill
          key={place.id}
          label={place.title}
          isChosen={isPlaceChosen(place)}
          onClick={() => togglePlace(place)}
        />
      ))}
    </div>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {(isSearchOpen || filters.searchText !== '') && (
        <label className="border-line flex h-11 items-center gap-2.5 rounded-xl border bg-white pl-3.5 focus-within:border-green-300">
          <Search className="h-[18px] w-[18px] shrink-0 text-green-500" aria-hidden="true" />
          <span className="sr-only">{labels.search[locale]}</span>
          <input
            type="search"
            // opened by a tap on the search button, so the keyboard should come up with it
            autoFocus={isSearchOpen}
            placeholder={labels.search[locale]}
            value={filters.searchText}
            onChange={(event) => update({ searchText: event.target.value })}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-green-900 outline-hidden placeholder:text-green-500 [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.searchText !== '' && (
            <button
              type="button"
              onClick={() => update({ searchText: '' })}
              aria-label={labels.clearSearch[locale]}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-green-500"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          )}
        </label>
      )}

      {/* bleeds to the screen's edges, so a chip that does not fit shows that the row scrolls */}
      <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          aria-expanded={openPanel === 'all'}
          aria-controls="filter-panel"
          aria-label={
            activeCount > 0
              ? `${labels.filter[locale]}, ${labels.activeFilters[locale].replace('{{count}}', String(activeCount))}`
              : undefined
          }
          onClick={() => toggle('all')}
          className={chipClassName(openPanel === 'all')}
        >
          <ListFilter className="h-[18px] w-[18px]" aria-hidden="true" />
          {labels.filter[locale]}
          {activeCount > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold',
                openPanel === 'all'
                  ? 'text-conveniat-green bg-white'
                  : 'bg-conveniat-green text-white',
              )}
            >
              {activeCount}
            </span>
          )}
        </button>

        {showStarredToggle && (
          <button
            type="button"
            aria-pressed={filters.starredOnly}
            onClick={() => update({ starredOnly: !filters.starredOnly })}
            className={cn(
              chipClassName(false),
              filters.starredOnly && 'border-amber-700 bg-amber-50 text-amber-700',
            )}
          >
            <Star
              className={cn('h-[18px] w-[18px]', filters.starredOnly && 'fill-amber-700')}
              aria-hidden="true"
            />
            {labels.favourites[locale]}
          </button>
        )}

        <button
          type="button"
          aria-expanded={openPanel === 'category'}
          aria-controls="filter-panel"
          onClick={() => toggle('category')}
          className={chipClassName(filters.selectedCategory !== undefined)}
        >
          {filters.selectedCategory?.title ?? labels.category[locale]}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', openPanel === 'category' && 'rotate-180')}
            aria-hidden="true"
          />
        </button>

        {availableLocations.length > 0 && (
          <button
            type="button"
            aria-expanded={openPanel === 'place'}
            aria-controls="filter-panel"
            onClick={() => toggle('place')}
            className={chipClassName(filters.selectedLocations.length > 0)}
          >
            <span className="max-w-40 truncate">{placeLabel}</span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', openPanel === 'place' && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {openPanel !== undefined && (
        <div id="filter-panel" className="border-line rounded-[14px] border bg-white p-3">
          {openPanel === 'category' && categoryOptions}
          {openPanel === 'place' && placeOptions}
          {openPanel === 'all' && (
            <div className="space-y-4">
              <section className="space-y-2">
                <SectionLabel as="h3">{labels.category[locale]}</SectionLabel>
                {categoryOptions}
              </section>
              {availableLocations.length > 0 && (
                <section className="space-y-2">
                  <SectionLabel as="h3">{labels.place[locale]}</SectionLabel>
                  {placeOptions}
                </section>
              )}
              <div className="flex gap-2">
                <Button
                  variant="quiet"
                  size="touch"
                  className="flex-1"
                  disabled={activeCount === 0}
                  onClick={() => onFiltersChange({ ...noFilters, searchText: filters.searchText })}
                >
                  {labels.resetAll[locale]}
                </Button>
                <Button
                  variant="primary"
                  size="touch"
                  className="flex-1"
                  onClick={() => setOpenPanel(undefined)}
                >
                  {labels.done[locale]}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
