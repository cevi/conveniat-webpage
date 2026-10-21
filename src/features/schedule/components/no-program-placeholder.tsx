'use client';

import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { FilterState } from '@/features/schedule/components/search-filter-bar';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { CalendarX, FilterX, SearchX, Star } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
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

const noFilters: FilterState = {
  searchText: '',
  selectedLocations: [],
  selectedCategory: undefined,
  starredOnly: false,
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
  const activeCount = [hasSearch, hasCategory, filters.starredOnly].filter(Boolean).length;

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
