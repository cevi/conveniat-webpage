'use client';

import type React from 'react';
import { useCallback, useId } from 'react';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { SectionLabel } from '@/components/ui/section-label';
import { Switch } from '@/components/ui/switch';
import type { CampCategory, CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { headerButtonClassName } from '@/features/schedule/components/schedule-loading-skeleton';
import type { TimeOfDay } from '@/features/schedule/utils/programme-utils';
import { TIMES_OF_DAY } from '@/features/schedule/utils/programme-utils';
import type { FilterState } from '@/features/schedule/utils/schedule-filters';
import {
  activeFilterCount,
  noFilters,
  showEntriesLabel,
  timeOfDayLabels,
} from '@/features/schedule/utils/schedule-filters';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import { Check, ListFilter, Search, Shield } from 'lucide-react';

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
  favouritesOnly: { de: 'Nur Favoriten', en: 'Favourites only', fr: 'Favoris seulement' },
  showLogistics: {
    de: 'Anreise & Essen anzeigen',
    en: 'Show arrival & meals',
    fr: 'Afficher arrivée & repas',
  },
  leadersOnly: { de: 'Für Leitende', en: 'For Leitende', fr: 'Pour les Leitende' },
  leadersOnlyHelp: {
    de: 'Nur Programmpunkte mit Material, Sicherheit oder Schlechtwetter',
    en: 'Only blocks with material, safety or bad weather notes',
    fr: 'Seulement les blocs avec matériel, sécurité ou mauvais temps',
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
  withoutLogistics: {
    de: 'Ohne Anreise & Essen',
    en: 'Without arrival & meals',
    fr: 'Sans arrivée & repas',
  },
} satisfies Record<string, StaticTranslationString>;

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
  /** the control for the view, own Quartier or whole camp, at the top of the filter sheet */
  view?: React.ReactNode;
  /** the view as it is, leading the line of what applies */
  viewSummary?: React.ReactNode;
  /** the filter sheet, opened by `FilterHeaderButton` in the app header */
  isFilterOpen: boolean;
  onFilterOpenChange: (isOpen: boolean) => void;
  /** whether to offer "Für Leitende": to the people who may read the part for Leitende only */
  canFilterForLeaders?: boolean;
  /** how many entries the list shows with the filters as they are, for the closing button */
  shownCount: number;
  /** the search button in the app header opens the search field */
  isSearchOpen: boolean;
  className?: string;
}

/** The search as a 44px icon in the app header; it opens the field over the list. */
export const SearchHeaderButton: React.FC<{
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ label, isOpen, onToggle }) => (
  <button
    type="button"
    aria-label={label}
    aria-expanded={isOpen}
    onClick={onToggle}
    className={headerButtonClassName}
  >
    <Search className="h-[22px] w-[22px]" aria-hidden="true" />
  </button>
);

/** how many filters are on, as a small green count */
const CountBadge: React.FC<{ count: number }> = ({ count }) => (
  <span
    aria-hidden="true"
    className="bg-conveniat-green flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
  >
    {count}
  </span>
);

/**
 * The filter as a 44px icon in the app header, with the count of filters that are on, for a
 * page that shows `SearchFilterBar` with `isFilterOpen`.
 */
export const FilterHeaderButton: React.FC<{
  filters: FilterState;
  isOpen: boolean;
  onOpen: () => void;
  locale: Locale;
}> = ({ filters, isOpen, onOpen, locale }) => {
  const count = activeFilterCount(filters);
  const countText =
    count === 1
      ? labels.activeFilter[locale]
      : labels.activeFilters[locale].replace('{{count}}', String(count));
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={count > 0 ? `${labels.filter[locale]}, ${countText}` : labels.filter[locale]}
      onClick={onOpen}
      className={headerButtonClassName}
    >
      <ListFilter className="h-[22px] w-[22px]" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5">
          <CountBadge count={count} />
        </span>
      )}
    </button>
  );
};

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
  icon?: LucideIcon;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}> = ({ label, hint, icon: Icon, checked, onCheckedChange }) => {
  const id = useId();
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        {/* the label names the switch, and a tap on it flips the switch too */}
        <label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-2 text-[15px] text-green-900"
        >
          {Icon !== undefined && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
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
 * The search field, opened from the header, and under the days one quiet line of what the list
 * shows: the view and the filters that are on. The filters open in a sheet from below, from the
 * header or from that line; the list underneath follows every change at once, so the sheet's
 * button only closes it.
 */
export const SearchFilterBar: React.FC<SearchFilterBarProperties> = ({
  filters,
  onFiltersChange,
  availableLocations = [],
  availableCategories,
  isProgramme = true,
  view,
  viewSummary,
  isFilterOpen,
  onFilterOpenChange,
  canFilterForLeaders = false,
  shownCount,
  isSearchOpen,
  className,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const update = useCallback(
    (change: Partial<FilterState>): void => onFiltersChange({ ...filters, ...change }),
    [filters, onFiltersChange],
  );

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

  // the filters that are on, in words, for the line under the days
  const [onlyPlace] = filters.selectedLocations;
  const placesText =
    filters.selectedLocations.length > 1
      ? labels.places[locale].replace('{{count}}', String(filters.selectedLocations.length))
      : onlyPlace?.title;
  const appliedFilters = [
    filters.selectedCategory?.title,
    placesText,
    ...filters.timesOfDay.map((timeOfDay) => timeOfDayLabels[timeOfDay][locale]),
    filters.starredOnly ? labels.favouritesOnly[locale] : undefined,
    filters.leadersOnly ? labels.leadersOnly[locale] : undefined,
    filters.showLogistics ? undefined : labels.withoutLogistics[locale],
  ].filter((part): part is string => part !== undefined && part !== '');

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
        onClick={() => onFilterOpenChange(false)}
      >
        {showEntriesLabel(shownCount, locale)}
      </Button>
    </div>
  );

  const isSearchShown = isSearchOpen || filters.searchText !== '';
  const hasLine = viewSummary !== undefined || appliedFilters.length > 0;

  return (
    <>
      {/* nothing to show takes no room: the list then starts right under the days */}
      {(isSearchShown || hasLine) && (
        <div className={cn('space-y-3', className)}>
          {isSearchShown && (
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

          {/* what the list shows, in words, under the days; a tap opens the filter to change it */}
          {hasLine && (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isFilterOpen}
              onClick={() => onFilterOpenChange(true)}
              className="flex min-h-[32px] w-full min-w-0 cursor-pointer items-center gap-1.5 text-left text-[13px] text-green-700 hover:text-green-900"
            >
              <span className="sr-only">{labels.filter[locale]}: </span>
              {viewSummary !== undefined && (
                <span className="flex shrink-0 items-center gap-1.5 font-semibold text-green-900">
                  {viewSummary}
                </span>
              )}
              {appliedFilters.length > 0 && (
                <span className="truncate">
                  {viewSummary !== undefined && '· '}
                  {appliedFilters.join(' · ')}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      <BottomSheet
        open={isFilterOpen}
        onOpenChange={onFilterOpenChange}
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
            {canFilterForLeaders && (
              <SwitchRow
                label={labels.leadersOnly[locale]}
                hint={labels.leadersOnlyHelp[locale]}
                icon={Shield}
                checked={filters.leadersOnly}
                onCheckedChange={(leadersOnly) => update({ leadersOnly })}
              />
            )}
          </div>
        )}

        <section className={cn('space-y-2 pb-5', !isProgramme && 'pt-1')}>
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
          <section className="space-y-2 pb-5">
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
    </>
  );
};
