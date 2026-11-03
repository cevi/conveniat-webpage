/** The kinds of result the site search returns; the order is the order of the filters. */
export const SEARCH_RESULT_TYPES = ['page', 'document', 'news'] as const;
export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

export const SEARCH_SORTS = ['relevance', 'newest'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

/** `month` is the last 30 days, `year` this calendar year, `older` everything before it. */
export const SEARCH_PERIODS = ['any', 'month', 'year', 'older'] as const;
export type SearchPeriod = (typeof SEARCH_PERIODS)[number];

/** A page of a PDF on which the searched words stand. */
export interface SearchMatch {
  /** 1-based, as a reader counts */
  page: number;
  snippet: string;
}

export interface SearchLinkedPage {
  title: string;
  url: string;
}

export interface SearchDocumentDetails {
  /** opens the file inline, in the language of the search */
  fileUrl: string;
  filename: string;
  mimeType: string;
  updatedAt: string;
  /** "PDF", "DOCX": what visitors know a file type by */
  typeLabel: string | undefined;
  isPdf: boolean;
  filesize: number | undefined;
  pageCount: number | undefined;
  thumbnailUrl: string | undefined;
  matches: SearchMatch[];
  /** the public pages that link to the document, which are what makes it findable */
  linkedFrom: SearchLinkedPage[];
}

export interface SearchResult {
  /** unique over all types, `document:<id>` */
  key: string;
  type: SearchResultType;
  title: string;
  url: string;
  excerpt: string;
  /** ISO date, see `search_date` in the index */
  date: string | undefined;
  /** for a news entry, the page it is shown on */
  shownOn?: SearchLinkedPage;
  document?: SearchDocumentDetails;
}

export interface SiteSearchResponse {
  results: SearchResult[];
  /** results per type for the current query and period, whatever types are chosen */
  counts: Record<SearchResultType, number>;
  /** results of the chosen types */
  total: number;
  page: number;
  totalPages: number;
}

export interface SiteSearchOptions {
  query: string;
  /** none chosen means all */
  types: SearchResultType[];
  sort: SearchSort;
  period: SearchPeriod;
  page: number;
  pageSize: number;
}

const isOneOf = <T extends string>(values: readonly T[], value: string): value is T =>
  (values as readonly string[]).includes(value);

const firstValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/**
 * Reads the search options from the query string of the search page. Anything it does not know
 * falls back to the default, so an old or hand-edited link still shows a search.
 */
export const parseSearchParameters = (
  parameters: Record<string, string | string[] | undefined>,
): Omit<SiteSearchOptions, 'pageSize'> => {
  const types = firstValue(parameters['type'])
    .split(',')
    .filter((type): type is SearchResultType => isOneOf(SEARCH_RESULT_TYPES, type));
  const sort = firstValue(parameters['sort']);
  const period = firstValue(parameters['period']);
  const page = Number.parseInt(firstValue(parameters['page']), 10);
  return {
    query: firstValue(parameters['q']).trim(),
    types: [...new Set(types)],
    sort: isOneOf(SEARCH_SORTS, sort) ? sort : 'relevance',
    period: isOneOf(SEARCH_PERIODS, period) ? period : 'any',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
};

/** The query string of the search page for the options; defaults are left out. */
export const buildSearchQueryString = (
  options: Partial<Omit<SiteSearchOptions, 'pageSize'>> & { query: string },
): string => {
  const parameters = new URLSearchParams({ q: options.query });
  if (options.types !== undefined && options.types.length > 0) {
    parameters.set('type', options.types.join(','));
  }
  if (options.sort !== undefined && options.sort !== 'relevance') {
    parameters.set('sort', options.sort);
  }
  if (options.period !== undefined && options.period !== 'any') {
    parameters.set('period', options.period);
  }
  if (options.page !== undefined && options.page > 1) parameters.set('page', String(options.page));
  return parameters.toString();
};
