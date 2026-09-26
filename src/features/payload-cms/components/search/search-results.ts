import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { extractTextContent } from '@/features/payload-cms/payload-cms/utils/extract-rich-text';
import type { Blog, GenericPage, Permission } from '@/features/payload-cms/payload-types';
import { hasPermissions } from '@/utils/has-permissions';
import type { PaginatedDocs } from 'payload';

const EXCERPT_LENGTH = 150;

/** What a search result card renders, and all of a document that is sent to the browser. */
export interface SearchResultCard {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  excerpt: string;
}

/** Pagination numbers of the underlying query, without its documents. */
export interface SearchResultPagination {
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | undefined;
  nextPage: number | undefined;
}

export interface SearchResults {
  results: SearchResultCard[];
  pagination: SearchResultPagination;
}

const buildExcerpt = (mainContent: unknown): string => {
  // Search only returns published documents, but guard anyway: a missing block list would
  // otherwise take down the whole result page.
  if (!Array.isArray(mainContent)) return '';
  const text = extractTextContent(mainContent as ContentBlock[]);
  return text.length > EXCERPT_LENGTH ? text.slice(0, EXCERPT_LENGTH) + '...' : text;
};

/**
 * Drops the documents the visitor may not see and reduces the rest to the fields a result card
 * renders. The return value is passed to a client component, so it must never carry a whole
 * Payload document: restricted pages would reach the browser in the RSC payload.
 *
 * @param documents - one page of generic pages or blog posts, populated at depth 1
 * @param getTitle - picks the card headline from a document
 */
export const toPermittedSearchResults = async <T extends GenericPage | Blog>(
  documents: PaginatedDocs<T>,
  getTitle: (document: T) => string,
): Promise<SearchResults> => {
  const permissions = await Promise.all(
    documents.docs.map((document) => hasPermissions(document.content.permissions as Permission)),
  );

  const results = documents.docs
    .filter((_, index) => permissions[index] ?? false)
    .map((document): SearchResultCard => ({
      id: document.id,
      url: `/${document.seo.urlSlug}`,
      title: getTitle(document),
      createdAt: document.createdAt,
      excerpt: buildExcerpt(document.content.mainContent),
    }));

  return {
    results,
    pagination: {
      totalPages: documents.totalPages,
      hasPrevPage: documents.hasPrevPage,
      hasNextPage: documents.hasNextPage,
      prevPage: documents.prevPage ?? undefined,
      nextPage: documents.nextPage ?? undefined,
    },
  };
};
