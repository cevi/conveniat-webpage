import type { VisitDayHof } from '@/features/visit-day/visit-day-settings';

/** Lower case and without accents, so "zuri", "Züri" and "ZÜRI" find the same Hof. */
const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * The Höfe whose name contains every word of the search, in the order given. An empty search
 * finds none: the list answers a question and is not a directory.
 */
export const findVisitDayHoefe = (hoefe: VisitDayHof[], search: string): VisitDayHof[] => {
  const words = normalize(search)
    .split(/\s+/)
    .filter((word) => word !== '');
  if (words.length === 0) return [];
  return hoefe.filter((hof) => {
    const name = normalize(hof.name);
    return words.every((word) => name.includes(word));
  });
};
