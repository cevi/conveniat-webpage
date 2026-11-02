import {
  formatFileSize,
  formatSearchDate,
  pageCountLabel,
  typeLabelSingular,
} from '@/features/payload-cms/components/search/search-translations';
import type { SearchResult, SearchResultType } from '@/features/payload-cms/search/search-types';
import type { Locale } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import { FileText, LayoutPanelTop, Newspaper } from 'lucide-react';

export const resultTypeIcons: Record<SearchResultType, LucideIcon> = {
  page: LayoutPanelTop,
  document: FileText,
  news: Newspaper,
};

/**
 * The facts under a result's title, joined into one line: for a document its type, size, pages
 * and date, for a page where it lives, for a news entry its date and the page it is shown on.
 */
export const resultMetaParts = (result: SearchResult, locale: Locale): string[] => {
  const date = result.date === undefined ? undefined : formatSearchDate(result.date, locale);
  switch (result.type) {
    case 'document': {
      const details = result.document;
      return [
        details?.typeLabel ?? typeLabelSingular.document[locale],
        details?.filesize === undefined ? undefined : formatFileSize(details.filesize, locale),
        details?.pageCount === undefined ? undefined : pageCountLabel(details.pageCount)[locale],
        date,
      ].filter((part): part is string => part !== undefined);
    }
    case 'news': {
      return [typeLabelSingular.news[locale], date, result.shownOn?.title].filter(
        (part): part is string => part !== undefined,
      );
    }
    case 'page': {
      return [decodeURI(result.url)];
    }
  }
};
