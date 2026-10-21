import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import type { TimeOfDay } from '@/features/schedule/utils/programme-utils';
import type { Locale, StaticTranslationString } from '@/types/types';

const labels = {
  showEntry: { de: '1 Eintrag anzeigen', en: 'Show 1 entry', fr: 'Afficher 1 entrée' },
  showEntries: {
    de: '{{count}} Einträge anzeigen',
    en: 'Show {{count}} entries',
    fr: 'Afficher {{count}} entrées',
  },
} satisfies Record<string, StaticTranslationString>;

/** Morgen, Nachmittag, Abend: the names of the parts of the day the filter offers. */
export const timeOfDayLabels: Record<TimeOfDay, StaticTranslationString> = {
  morning: { de: 'Morgen', en: 'Morning', fr: 'Matin' },
  afternoon: { de: 'Nachmittag', en: 'Afternoon', fr: 'Après-midi' },
  evening: { de: 'Abend', en: 'Evening', fr: 'Soir' },
};

export interface FilterState {
  searchText: string;
  selectedLocations: CampMapAnnotation[];
  selectedCategory: { id: string; title: string } | undefined;
  starredOnly: boolean;
  /** the parts of the day to show; none means the whole day */
  timesOfDay: TimeOfDay[];
  /** meals, transfers and fixed points such as Anreise, on by default */
  showLogistics: boolean;
}

/** Nothing searched and nothing filtered: the whole day, logistics included. */
export const noFilters: FilterState = {
  searchText: '',
  selectedLocations: [],
  selectedCategory: undefined,
  starredOnly: false,
  timesOfDay: [],
  showLogistics: true,
};

/** How many filters narrow the list, the search aside: the number on the Filter chip. */
export const activeFilterCount = (filters: FilterState): number =>
  [
    filters.selectedCategory !== undefined,
    filters.selectedLocations.length > 0,
    filters.starredOnly,
    filters.timesOfDay.length > 0,
    !filters.showLogistics,
  ].filter(Boolean).length;

/** The label of the button that closes the filter: "3 Einträge anzeigen", "1 Eintrag anzeigen". */
export const showEntriesLabel = (count: number, locale: Locale): string =>
  count === 1
    ? labels.showEntry[locale]
    : labels.showEntries[locale].replace('{{count}}', String(count));
