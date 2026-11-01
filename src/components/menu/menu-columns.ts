import type { StaticTranslationString } from '@/types/types';

/** The heading of the column that collects the top-level entries without entries below them. */
export const moreColumnLabel: StaticTranslationString = {
  de: 'Weiteres',
  en: 'More',
  fr: 'Plus',
};

/**
 * Lays the top level of the main menu out as the menu shows it: every entry with entries below it
 * is a column of its own, and the entries without any are collected, in their order, in one last
 * column, so a single link does not take up a whole column.
 */
export const splitMenuColumns = <T extends { subMenu?: unknown[] | null | undefined }>(
  items: T[],
): { columns: T[]; more: T[] } => {
  const hasChildren = (item: T): boolean => Array.isArray(item.subMenu) && item.subMenu.length > 0;
  return {
    columns: items.filter((item) => hasChildren(item)),
    more: items.filter((item) => !hasChildren(item)),
  };
};
