'use client';

import type React from 'react';
import { useCallback, useId, useState } from 'react';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { SectionLabel } from '@/components/ui/section-label';
import { Switch } from '@/components/ui/switch';
import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { TimeOfDay } from '@/features/schedule/utils/programme-utils';
import { TIMES_OF_DAY } from '@/features/schedule/utils/programme-utils';
import type { FilterState } from '@/features/schedule/utils/schedule-filters';
import {
  activeFilterCount,
  noFilters,
  showEntriesLabel,
  timeOfDayLabels,
} from '@/features/schedule/utils/schedule-filters';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, ListFilter, Star } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';

const labels = {
  search: { de: 'Suchen …', en: 'Search …', fr: 'Rechercher …' },
  filter: { de: 'Filter', en: 'Filters', fr: 'Filtres' },
  activeFilter: { de: '1 aktiver Filter', en: '1 active filter', fr: '1 filtre actif' },
  activeFilters: {
    de: '{{count}} aktive Filter',
    en: '{{count}} active filters',
    fr: '{{count}} filtres actifs',
  },
  view: { de: 'Ansicht', en: 'View', fr: 'Affichage' },
  favourites: { de: 'Favoriten', en: 'Favourites', fr: 'Favoris' },
  favouritesOnly: { de: 'Nur Favoriten', en: 'Favourites only', fr: 'Favoris seulement' },
  showLogistics: {
    de: 'Anreise & Essen anzeigen',
    en: 'Show arrival & meals',
    fr: 'Afficher arrivée & repas',
  },
  showLogisticsHelp: {
    de: 'Logistik-Einträge in der Zeitleiste',
    en: 'Logistics entries in the timeline',
    fr: 'Entrées logistiques dans la chronologie',
  },
  category: { de: 'Kategorie', en: 'Category', fr: 'Catégorie' },
  place: { de: 'Ort', en: 'Place', fr: 'Lieu' },
  places: { de: '{{count}} Orte', en: '{{count}} places', fr: '{{count}} lieux' },
  timeOfDay: { de: 'Tageszeit', en: 'Time of day', fr: 'Moment de la journée' },
  reset: { de: 'Zurücksetzen', en: 'Reset', fr: 'Réinitialiser' },
} satisfies Record<string, StaticTranslationString>;

type Section = 'category' | 'place';

interface SearchFilterBarProperties {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableLocations?: CampMapAnnotation[];
  availableCategories: CampCategory[];
  /**
   * The programme filters by favourites, logistics and time of day as well; helper shifts have
   * none of these, so they leave them out.
   */
  isProgramme?: boolean;
  /** the control for the view, own Quartier or whole camp, repeated at the top of the filter */
  view?: React.ReactNode;
  /** how many entries the list shows with the filters as they are, for the closing button */
  shownCount: number;
  /** the search button in the app header opens the search field */
  isSearchOpen: boolean;
  className?: string;
}

/** a round 44px button beside the view, as the design draws the favourites and the filter */
const roundButtonClassName =
  'border-line flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border bg-white text-green-900 transition-colors hover:border-green-300';

/** how many filters are on, as a small green count */
const CountBadge: React.FC<{ count: number }> = ({ count }) => (
  <span
    aria-hidden="true"
    className="bg-conveniat-green flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
  >
    {count}
  </span>
);

const chipClassName = (isActive: boolean): string =>
  cn(
    'flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold whitespace-nowrap transition-colors',
    isActive
      ? 'bg-conveniat-green border-conveniat-green text-white'
      : 'border-line bg-white text-green-900 hover:border-green-300',
  );

/** One option in the filter: a pill that is pressed, filled and ticked while it is chosen. */
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
      'flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold transition-colors',
      isChosen
        ? 'bg-conveniat-green border-conveniat-green text-white'
        : 'border-line bg-white text-green-900 hover:border-green-300',
    )}
  >
    {isChosen && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
    {label}
  </button>
);

/** A setting of the filter as a row: what it does on the left, its switch on the right. */
const SwitchRow: React.FC<{
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ label, hint, checked, onCheckedChange }) => {
  const id = useId();
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        {/* the label names the switch, and a tap on it flips the switch too */}
        <label htmlFor={id} className="block cursor-pointer text-[15px] text-green-900">
          {label}
        </label>
        {hint !== undefined && (
          <p id={`${id}-hint`} className="text-[13px] text-green-700">
            {hint}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={hint === undefined ? undefined : `${id}-hint`}
      />
    </div>
  );
};

/**
 * The search field, opened from the header, and the filters as a row of chips under it: all
 * filters at once, the favourites, the category and the place. A chip says what it filters by
 * while it does. The filters open in a sheet from below, at the section of the chip tapped; the
 * list underneath follows every change at once, so the sheet's button only closes it.
 */
export const SearchFilterBar: React.FC<SearchFilterBarProperties> = ({
  filters,
  onFiltersChange,
  availableLocations = [],
  availableCategories,
  isProgramme = true,
  view,
  shownCount,
  isSearchOpen,
  className,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isOpen, setIsOpen] = useState(false);
  const [focusedSection, setFocusedSection] = useState<Section>();

  const update = useCallback(
    (change: Partial<FilterState>): void => onFiltersChange({ ...filters, ...change }),
    [filters, onFiltersChange],
  );
  const openAt = (section?: Section): void => {
    setFocusedSection(section);
    setIsOpen(true);
  };
  // Opened from Kategorie or Ort, the sheet starts at that section. A stable callback runs
  // once as the section mounts, so choosing an option does not jump the sheet back.
  const scrollToSection = useCallback((section: HTMLElement | null): void => {
    const scroller = section?.parentElement;
    if (section === null || scroller === null || scroller === undefined) return;
    scroller.scrollTop = section.offsetTop - scroller.offsetTop;
  }, []);

  const isPlaceChosen = (place: CampMapAnnotation): boolean =>
    filters.selectedLocations.some(({ id }) => id === place.id);
  const togglePlace = (place: CampMapAnnotation): void =>
    update({
      selectedLocations: isPlaceChosen(place)
        ? filters.selectedLocations.filter(({ id }) => id !== place.id)
        : [...filters.selectedLocations, place],
    });
  const toggleTimeOfDay = (timeOfDay: TimeOfDay): void =>
    update({
      timesOfDay: filters.timesOfDay.includes(timeOfDay)
        ? filters.timesOfDay.filter((chosen) => chosen !== timeOfDay)
        : TIMES_OF_DAY.filter((part) => part === timeOfDay || filters.timesOfDay.includes(part)),
    });

  const activeCount = activeFilterCount(filters);
  const filterButtonLabel =
    activeCount > 0
      ? `${labels.filter[locale]}, ${(activeCount === 1 ? labels.activeFilter : labels.activeFilters)[locale].replace('{{count}}', String(activeCount))}`
      : labels.filter[locale];

  const footer = (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={activeCount === 0}
        onClick={() => onFiltersChange({ ...noFilters, searchText: filters.searchText })}
        className="min-h-11 shrink-0 cursor-pointer px-1 text-[15px] font-semibold text-green-900 underline underline-offset-4 disabled:cursor-default disabled:text-green-500 disabled:no-underline"
      >
        {labels.reset[locale]}
      </button>
      <Button
        variant="primary"
        size="touch"
        className="min-w-0 flex-1"
        onClick={() => setIsOpen(false)}
      >
        {showEntriesLabel(shownCount, locale)}
      </Button>
    </div>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {(isSearchOpen || filters.searchText !== '') && (
        <AppSearchBar
          onPage
          placeholder={labels.search[locale]}
          value={filters.searchText}
          onChange={(event) => update({ searchText: event.target.value })}
          onClear={() => update({ searchText: '' })}
          // opened by a tap on the search button, so the keyboard should come up with it
          autoFocus={isSearchOpen}
        />
      )}

      {/*
        One row: the view on the left, then two round buttons, the favourites and the filter. What
        the filter narrows to is told by the count on its button; Kategorie, Ort and Tageszeit
        live in its sheet.
      */}
      <div className="flex items-center gap-2">
        {view === undefined ? (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label={filterButtonLabel}
            onClick={() => openAt()}
            className={chipClassName(false)}
          >
            <ListFilter className="h-[18px] w-[18px]" aria-hidden="true" />
            {labels.filter[locale]}
            {activeCount > 0 && <CountBadge count={activeCount} />}
          </button>
        ) : (
          <div className="min-w-0 flex-1">{view}</div>
        )}

        {isProgramme && (
          <button
            type="button"
            aria-pressed={filters.starredOnly}
            aria-label={labels.favouritesOnly[locale]}
            onClick={() => update({ starredOnly: !filters.starredOnly })}
            className={cn(
              roundButtonClassName,
              filters.starredOnly && 'border-amber-700 bg-amber-50 text-amber-700',
            )}
          >
            <Star
              className={cn('h-5 w-5', filters.starredOnly && 'fill-amber-700')}
              aria-hidden="true"
            />
          </button>
        )}

        {view !== undefined && (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label={filterButtonLabel}
            onClick={() => openAt()}
            className={cn(roundButtonClassName, 'relative')}
          >
            <ListFilter className="h-5 w-5" aria-hidden="true" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1">
                <CountBadge count={activeCount} />
              </span>
            )}
          </button>
        )}
      </div>

      <BottomSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        title={labels.filter[locale]}
        footer={footer}
      >
        {view !== undefined && (
          <section className="space-y-2 pb-4">
            <SectionLabel as="h3">{labels.view[locale]}</SectionLabel>
            {view}
          </section>
        )}

        {isProgramme && (
          <div className="divide-line border-line mb-5 divide-y border-y">
            <SwitchRow
              label={labels.favouritesOnly[locale]}
              checked={filters.starredOnly}
              onCheckedChange={(starredOnly) => update({ starredOnly })}
            />
            <SwitchRow
              label={labels.showLogistics[locale]}
              hint={labels.showLogisticsHelp[locale]}
              checked={filters.showLogistics}
              onCheckedChange={(showLogistics) => update({ showLogistics })}
            />
          </div>
        )}

        <section
          ref={focusedSection === 'category' ? scrollToSection : undefined}
          className={cn('space-y-2 pb-5', !isProgramme && 'pt-1')}
        >
          <SectionLabel as="h3">{labels.category[locale]}</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((category) => (
              <OptionPill
                key={category.id}
                label={category.title}
                isChosen={filters.selectedCategory?.id === category.id}
                onClick={() =>
                  update({
                    selectedCategory:
                      filters.selectedCategory?.id === category.id
                        ? undefined
                        : { id: category.id, title: category.title },
                  })
                }
              />
            ))}
          </div>
        </section>

        {availableLocations.length > 0 && (
          <section
            ref={focusedSection === 'place' ? scrollToSection : undefined}
            className="space-y-2 pb-5"
          >
            <SectionLabel as="h3">{labels.place[locale]}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {availableLocations.map((place) => (
                <OptionPill
                  key={place.id}
                  label={place.title}
                  isChosen={isPlaceChosen(place)}
                  onClick={() => togglePlace(place)}
                />
              ))}
            </div>
          </section>
        )}

        {isProgramme && (
          <section className="space-y-2">
            <SectionLabel as="h3">{labels.timeOfDay[locale]}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {TIMES_OF_DAY.map((timeOfDay) => (
                <OptionPill
                  key={timeOfDay}
                  label={timeOfDayLabels[timeOfDay][locale]}
                  isChosen={filters.timesOfDay.includes(timeOfDay)}
                  onClick={() => toggleTimeOfDay(timeOfDay)}
                />
              ))}
            </div>
          </section>
        )}
      </BottomSheet>
    </div>
  );
};
