import type { VisitDayHof } from '@/features/visit-day/visit-day-settings';

/** Lower case and without accents, so "zuri", "Züri" and "ZÜRI" find the same Hof. */
const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Words relatives put before the name of an Abteilung that no Hof name contains: "Cevi Uster"
 * finds the Hof "Uster".
 */
const IGNORED_WORDS = new Set(['cevi', 'abteilung']);

/**
 * The Höfe whose name contains every word of the search, in the order given. A Hof is named
 * after its Abteilungen, e.g. "Thalwil + Wädenswil + Hirzel + March", so the name of any of
 * them finds it. An empty search finds none: the list answers a question and is not a directory.
 */
export const findVisitDayHoefe = (hoefe: VisitDayHof[], search: string): VisitDayHof[] => {
  const words = normalize(search)
    .split(/\s+/)
    .filter((word) => word !== '' && !IGNORED_WORDS.has(word));
  if (words.length === 0) return [];
  return hoefe.filter((hof) => {
    const name = normalize(hof.name);
    return words.every((word) => name.includes(word));
  });
};
