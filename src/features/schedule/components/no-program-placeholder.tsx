'use client';

import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { TimeOfDay } from '@/features/schedule/utils/programme-utils';
import type { FilterState } from '@/features/schedule/utils/schedule-filters';
import { noFilters } from '@/features/schedule/utils/schedule-filters';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import {
  CalendarX,
  Clock,
  FilterX,
  MapPinOff,
  SearchX,
  Shield,
  Star,
  Utensils,
} from 'lucide-react';
import type React from 'react';

const labels = {
  noFavourites: {
    de: 'Keine Favoriten an diesem Tag',
    en: 'No favourites on this day',
    fr: 'Aucun favori ce jour-là',
  },
  noFavouritesHelp: {
    de: 'Markiere Programmpunkte mit dem Stern, dann findest du sie hier.',
    en: 'Star a programme block and you will find it here.',
    fr: 'Ajoute une étoile à un bloc du programme et tu le retrouveras ici.',
  },
  showAll: { de: 'Alle anzeigen', en: 'Show all', fr: 'Tout afficher' },
  nothingFound: {
    de: 'Nichts gefunden für «{{term}}»',
    en: 'Nothing found for “{{term}}”',
    fr: 'Rien trouvé pour « {{term}} »',
  },
  nothingFoundHelp: {
    de: 'Prüfe die Schreibweise oder schau an einem anderen Tag.',
    en: 'Check the spelling or look on another day.',
    fr: "Vérifie l'orthographe ou regarde un autre jour.",
  },
  clearSearch: { de: 'Suche leeren', en: 'Clear search', fr: 'Effacer la recherche' },
  nothingInCategory: {
    de: 'Nichts in «{{category}}» an diesem Tag',
    en: 'Nothing in “{{category}}” on this day',
    fr: 'Rien dans « {{category}} » ce jour-là',
  },
  nothingAtPlace: {
    de: 'Nichts an «{{place}}» an diesem Tag',
    en: 'Nothing at “{{place}}” on this day',
    fr: 'Rien à « {{place}} » ce jour-là',
  },
  nothingAtPlaces: {
    de: 'Nichts an diesen {{count}} Orten an diesem Tag',
    en: 'Nothing at these {{count}} places on this day',
    fr: 'Rien à ces {{count}} lieux ce jour-là',
  },
  allPlaces: { de: 'Alle Orte', en: 'All places', fr: 'Tous les lieux' },
  nothingAtTimes: {
    de: 'Nichts zu diesen Tageszeiten an diesem Tag',
    en: 'Nothing at these times of day on this day',
    fr: 'Rien à ces moments de la journée ce jour-là',
  },
  wholeDay: {
    de: 'Ganzen Tag anzeigen',
    en: 'Show the whole day',
    fr: 'Afficher toute la journée',
  },
  onlyLogistics: {
    de: 'An diesem Tag gibt es nur Anreise und Essen',
    en: 'There is only arrival and meals on this day',
    fr: "Il n'y a que l'arrivée et les repas ce jour-là",
  },
  showLogistics: {
    de: 'Anreise & Essen anzeigen',
    en: 'Show arrival & meals',
    fr: 'Afficher arrivée & repas',
  },
  noLeaderNotes: {
    de: 'Keine Programmpunkte mit Infos für Leitende an diesem Tag',
    en: 'No programme blocks with information for Leitende on this day',
    fr: 'Aucun bloc du programme avec des infos pour les Leitende ce jour-là',
  },
  noLeaderNotesHelp: {
    de: 'Material, Sicherheit und Schlechtwetter stehen bei den Programmpunkten, die sie haben.',
    en: 'Material, safety and bad weather are listed on the blocks that have them.',
    fr: 'Le matériel, la sécurité et le mauvais temps figurent sur les blocs qui en ont.',
  },
  allBlocks: {
    de: 'Alle Programmpunkte anzeigen',
    en: 'Show all programme blocks',
    fr: 'Afficher tous les blocs',
  },
  allCategories: { de: 'Alle Kategorien', en: 'All categories', fr: 'Toutes les catégories' },
  noMatches: { de: 'Keine Treffer', en: 'No matches', fr: 'Aucun résultat' },
  noMatchesHelp: {
    de: 'Nichts an diesem Tag passt zu Suche und Filtern zusammen.',
    en: 'Nothing on this day matches the search and the filters together.',
    fr: 'Rien ce jour-là ne correspond à la fois à la recherche et aux filtres.',
  },
  resetAll: { de: 'Alles zurücksetzen', en: 'Reset all', fr: 'Tout réinitialiser' },
  emptyDay: {
    de: 'Noch kein Programm an diesem Tag',
    en: 'No programme on this day yet',
    fr: 'Pas encore de programme ce jour-là',
  },
  emptyDayHelp: {
    de: 'Schau an einem anderen Tag nach.',
    en: 'Have a look at another day.',
    fr: 'Regarde un autre jour.',
  },
} satisfies Record<string, StaticTranslationString>;

const nothingAtTimeOfDay: Record<TimeOfDay, StaticTranslationString> = {
  morning: {
    de: 'Nichts am Morgen an diesem Tag',
    en: 'Nothing in the morning on this day',
    fr: 'Rien le matin ce jour-là',
  },
  afternoon: {
    de: 'Nichts am Nachmittag an diesem Tag',
    en: 'Nothing in the afternoon on this day',
    fr: "Rien l'après-midi ce jour-là",
  },
  evening: {
    de: 'Nichts am Abend an diesem Tag',
    en: 'Nothing in the evening on this day',
    fr: 'Rien le soir ce jour-là',
  },
};

/**
 * What the programme of a day shows when nothing is in it: why, said for the one filter that
 * emptied it, and the way back out of exactly that filter. A day without anything planned gets a
 * plain note; the next-day button below the list is the way forward there.
 */
export const NoProgramPlaceholder: React.FC<{
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}> = ({ filters, onFiltersChange }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const hasSearch = filters.searchText.trim() !== '';
  const hasCategory = filters.selectedCategory !== undefined;
  const hasPlace = filters.selectedLocations.length > 0;
  const hasTimeOfDay = filters.timesOfDay.length > 0;
  const activeCount = [
    hasSearch,
    hasCategory,
    hasPlace,
    filters.starredOnly,
    hasTimeOfDay,
    !filters.showLogistics,
    filters.leadersOnly,
  ].filter(Boolean).length;

  const action = (label: string, next: FilterState): React.ReactNode => (
    <Button variant="quiet" size="touch" onClick={() => onFiltersChange(next)}>
      {label}
    </Button>
  );

  if (activeCount === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title={labels.emptyDay[locale]}
        description={labels.emptyDayHelp[locale]}
      />
    );
  }

  if (activeCount > 1) {
    return (
      <EmptyState
        icon={FilterX}
        title={labels.noMatches[locale]}
        description={labels.noMatchesHelp[locale]}
        action={action(labels.resetAll[locale], noFilters)}
      />
    );
  }

  if (filters.starredOnly) {
    return (
      <EmptyState
        icon={Star}
        title={labels.noFavourites[locale]}
        description={labels.noFavouritesHelp[locale]}
        action={action(labels.showAll[locale], { ...filters, starredOnly: false })}
      />
    );
  }

  if (filters.leadersOnly) {
    return (
      <EmptyState
        icon={Shield}
        title={labels.noLeaderNotes[locale]}
        description={labels.noLeaderNotesHelp[locale]}
        action={action(labels.allBlocks[locale], { ...filters, leadersOnly: false })}
      />
    );
  }

  if (hasSearch) {
    return (
      <EmptyState
        icon={SearchX}
        title={labels.nothingFound[locale].replace('{{term}}', filters.searchText.trim())}
        description={labels.nothingFoundHelp[locale]}
        action={action(labels.clearSearch[locale], { ...filters, searchText: '' })}
      />
    );
  }

  if (hasTimeOfDay) {
    const [onlyTime] = filters.timesOfDay;
    return (
      <EmptyState
        icon={Clock}
        title={
          filters.timesOfDay.length === 1 && onlyTime !== undefined
            ? nothingAtTimeOfDay[onlyTime][locale]
            : labels.nothingAtTimes[locale]
        }
        action={action(labels.wholeDay[locale], { ...filters, timesOfDay: [] })}
      />
    );
  }

  if (!filters.showLogistics) {
    return (
      <EmptyState
        icon={Utensils}
        title={labels.onlyLogistics[locale]}
        action={action(labels.showLogistics[locale], { ...filters, showLogistics: true })}
      />
    );
  }

  if (hasPlace) {
    const [onlyPlace] = filters.selectedLocations;
    return (
      <EmptyState
        icon={MapPinOff}
        title={
          filters.selectedLocations.length === 1 && onlyPlace !== undefined
            ? labels.nothingAtPlace[locale].replace('{{place}}', onlyPlace.title)
            : labels.nothingAtPlaces[locale].replace(
                '{{count}}',
                String(filters.selectedLocations.length),
              )
        }
        action={action(labels.allPlaces[locale], { ...filters, selectedLocations: [] })}
      />
    );
  }

  return (
    <EmptyState
      icon={FilterX}
      title={labels.nothingInCategory[locale].replace(
        '{{category}}',
        filters.selectedCategory?.title ?? '',
      )}
      action={action(labels.allCategories[locale], { ...filters, selectedCategory: undefined })}
    />
  );
};
