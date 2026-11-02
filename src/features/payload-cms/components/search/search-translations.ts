import type {
  SearchPeriod,
  SearchResultType,
  SearchSort,
} from '@/features/payload-cms/search/search-types';
import type { Locale, StaticTranslationString } from '@/types/types';

export const searchPlaceholder: StaticTranslationString = {
  de: 'Seiten, Dokumente und News durchsuchen',
  en: 'Search pages, documents and news',
  fr: 'Rechercher des pages, documents et actualités',
};

export const searchLabel: StaticTranslationString = {
  de: 'Suchen',
  en: 'Search',
  fr: 'Rechercher',
};

export const searchPageTitle: StaticTranslationString = {
  de: 'Suche',
  en: 'Search',
  fr: 'Recherche',
};

export const typeLabels: Record<SearchResultType, StaticTranslationString> = {
  page: { de: 'Seiten', en: 'Pages', fr: 'Pages' },
  document: { de: 'Dokumente', en: 'Documents', fr: 'Documents' },
  news: { de: 'News', en: 'News', fr: 'Actualités' },
};

export const typeLabelSingular: Record<SearchResultType, StaticTranslationString> = {
  page: { de: 'Seite', en: 'Page', fr: 'Page' },
  document: { de: 'Dokument', en: 'Document', fr: 'Document' },
  news: { de: 'News', en: 'News', fr: 'Actualité' },
};

export const allTypesLabel: StaticTranslationString = { de: 'Alle', en: 'All', fr: 'Tout' };

export const typeFilterLabel: StaticTranslationString = { de: 'Typ', en: 'Type', fr: 'Type' };

export const sortLabel: StaticTranslationString = {
  de: 'Sortierung',
  en: 'Sort by',
  fr: 'Trier par',
};

export const sortLabels: Record<SearchSort, StaticTranslationString> = {
  relevance: { de: 'Relevanz', en: 'Relevance', fr: 'Pertinence' },
  newest: { de: 'Neueste', en: 'Newest', fr: 'Plus récents' },
};

export const periodLabel: StaticTranslationString = {
  de: 'Aktualisiert',
  en: 'Updated',
  fr: 'Mis à jour',
};

/** `year` reads as the year itself, like "2026", which is filled in where it is shown. */
export const periodLabels: Record<Exclude<SearchPeriod, 'year'>, StaticTranslationString> = {
  any: { de: 'Jederzeit', en: 'Any time', fr: 'Toutes dates' },
  month: { de: 'Letzte 30 Tage', en: 'Last 30 days', fr: '30 derniers jours' },
  older: { de: 'Älter', en: 'Older', fr: 'Plus ancien' },
};

export const filterLabel: StaticTranslationString = { de: 'Filter', en: 'Filters', fr: 'Filtres' };

export const resetFiltersLabel: StaticTranslationString = {
  de: 'Filter zurücksetzen',
  en: 'Reset filters',
  fr: 'Réinitialiser les filtres',
};

export const showResultsLabel = (count: number): StaticTranslationString => ({
  de: count === 1 ? '1 Resultat zeigen' : `${count} Resultate zeigen`,
  en: count === 1 ? 'Show 1 result' : `Show ${count} results`,
  fr: count === 1 ? 'Afficher 1 résultat' : `Afficher ${count} résultats`,
});

export const resultCountLabel = (count: number, query: string): StaticTranslationString => ({
  de: `${count} ${count === 1 ? 'Resultat' : 'Resultate'} für «${query}»`,
  en: `${count} ${count === 1 ? 'result' : 'results'} for “${query}”`,
  fr: `${count} ${count === 1 ? 'résultat' : 'résultats'} pour « ${query} »`,
});

export const noQueryTitle: StaticTranslationString = {
  de: 'Wonach suchst du?',
  en: 'What are you looking for?',
  fr: 'Que cherches-tu ?',
};

export const noQueryDescription: StaticTranslationString = {
  de: 'Die Suche findet Seiten, Dokumente wie PDFs und News.',
  en: 'The search finds pages, documents such as PDFs, and news.',
  fr: 'La recherche trouve des pages, des documents comme des PDF et des actualités.',
};

export const recentSearchesLabel: StaticTranslationString = {
  de: 'Zuletzt gesucht',
  en: 'Recent searches',
  fr: 'Recherches récentes',
};

export const searchingLabel = (query: string): StaticTranslationString => ({
  de: `Suche nach «${query}» …`,
  en: `Searching for “${query}” …`,
  fr: `Recherche de « ${query} » …`,
});

export const retryLabel: StaticTranslationString = {
  de: 'Nochmals versuchen',
  en: 'Try again',
  fr: 'Réessayer',
};

export const noResultsTitle: StaticTranslationString = {
  de: 'Keine Resultate gefunden',
  en: 'No results found',
  fr: 'Aucun résultat trouvé',
};

export const noResultsDescription: StaticTranslationString = {
  de: 'Versuche es mit einem anderen oder kürzeren Suchbegriff.',
  en: 'Try a different or shorter search term.',
  fr: 'Essaie avec un terme de recherche différent ou plus court.',
};

export const noResultsWithFiltersDescription: StaticTranslationString = {
  de: 'Mit diesen Filtern gibt es nichts. Ohne Filter findet die Suche mehr.',
  en: 'Nothing matches these filters. Without them the search finds more.',
  fr: 'Rien ne correspond à ces filtres. Sans eux, la recherche trouve davantage.',
};

export const alsoFoundLabel: StaticTranslationString = {
  de: 'Auch gefunden:',
  en: 'Also found:',
  fr: 'Également trouvé :',
};

export const showAllLabel: StaticTranslationString = {
  de: 'Alle zeigen',
  en: 'Show all',
  fr: 'Tout afficher',
};

export const matchesLabel: StaticTranslationString = {
  de: 'Fundstellen',
  en: 'Matches',
  fr: 'Occurrences',
};

export const moreMatchesLabel = (count: number): StaticTranslationString => ({
  de: count === 1 ? '+1 weitere Fundstelle' : `+${count} weitere Fundstellen`,
  en: count === 1 ? '+1 more match' : `+${count} more matches`,
  fr: count === 1 ? '+1 autre occurrence' : `+${count} autres occurrences`,
});

export const matchCountLabel = (count: number): StaticTranslationString => ({
  de: count === 1 ? '1 Fundstelle' : `${count} Fundstellen`,
  en: count === 1 ? '1 match' : `${count} matches`,
  fr: count === 1 ? '1 occurrence' : `${count} occurrences`,
});

export const pageShortLabel = (page: number): StaticTranslationString => ({
  de: `S. ${page}`,
  en: `p. ${page}`,
  fr: `p. ${page}`,
});

export const pageCountLabel = (count: number): StaticTranslationString => ({
  de: count === 1 ? '1 Seite' : `${count} Seiten`,
  en: count === 1 ? '1 page' : `${count} pages`,
  fr: count === 1 ? '1 page' : `${count} pages`,
});

export const updatedOnLabel = (date: string): StaticTranslationString => ({
  de: `Aktualisiert ${date}`,
  en: `Updated ${date}`,
  fr: `Mis à jour le ${date}`,
});

export const openLabel: StaticTranslationString = { de: 'Öffnen', en: 'Open', fr: 'Ouvrir' };

export const linkedFromLabel: StaticTranslationString = {
  de: 'Verlinkt auf',
  en: 'Linked on',
  fr: 'Lié sur',
};

export const shownOnLabel: StaticTranslationString = {
  de: 'Erschienen auf',
  en: 'Shown on',
  fr: 'Publié sur',
};

export const closePreviewLabel: StaticTranslationString = {
  de: 'Vorschau schliessen',
  en: 'Close preview',
  fr: "Fermer l'aperçu",
};

export const previousPageLabel: StaticTranslationString = {
  de: 'Zurück',
  en: 'Previous',
  fr: 'Précédent',
};

export const nextPageLabel: StaticTranslationString = { de: 'Weiter', en: 'Next', fr: 'Suivant' };

export const pageOfLabel = (page: number, total: number): StaticTranslationString => ({
  de: `Seite ${page} von ${total}`,
  en: `Page ${page} of ${total}`,
  fr: `Page ${page} sur ${total}`,
});

export const instantHintLabel: StaticTranslationString = {
  de: 'Tippe, um Seiten, Dokumente und News zu durchsuchen.',
  en: 'Type to search pages, documents and news.',
  fr: 'Tape pour rechercher des pages, documents et actualités.',
};

export const instantOfflineLabel: StaticTranslationString = {
  de: 'Du bist offline. Die Suche braucht eine Verbindung.',
  en: 'You are offline. The search needs a connection.',
  fr: 'Tu es hors ligne. La recherche a besoin d’une connexion.',
};

export const instantErrorLabel: StaticTranslationString = {
  de: 'Die Suche hat nicht geantwortet. Versuche es gleich nochmals.',
  en: 'The search did not answer. Try again in a moment.',
  fr: 'La recherche n’a pas répondu. Réessaie dans un instant.',
};

export const instantOpenKeyLabel: StaticTranslationString = {
  de: 'öffnen',
  en: 'open',
  fr: 'ouvrir',
};

export const instantNavigateKeyLabel: StaticTranslationString = {
  de: 'navigieren',
  en: 'navigate',
  fr: 'naviguer',
};

export const instantCloseKeyLabel: StaticTranslationString = {
  de: 'schliessen',
  en: 'close',
  fr: 'fermer',
};

export const fullViewLabel = (count: number): StaticTranslationString => ({
  de: count === 1 ? '1 Resultat in der Vollansicht' : `Alle ${count} Resultate in der Vollansicht`,
  en: count === 1 ? '1 result in the full view' : `All ${count} results in the full view`,
  fr: count === 1 ? '1 résultat en vue complète' : `Les ${count} résultats en vue complète`,
});

/** A date as the camp reads it, in Europe/Zurich, like 14.10.2026. */
export const formatSearchDate = (date: string, locale: Locale): string =>
  new Date(date).toLocaleDateString(locale === 'en' ? 'en-GB' : `${locale}-CH`, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  });

/** A file size in the unit that keeps it short, like 1,2 MB. */
export const formatFileSize = (bytes: number, locale: Locale): string => {
  const format = (value: number, unit: string): string =>
    `${value.toLocaleString(`${locale}-CH`, { maximumFractionDigits: 1 })} ${unit}`;
  if (bytes < 1024) return format(bytes, 'B');
  if (bytes < 1024 ** 2) return format(bytes / 1024, 'KB');
  return format(bytes / 1024 ** 2, 'MB');
};
