'use client';
import type { SearchFilters } from '@/features/payload-cms/components/search/search-filter-panel';
import { parseSearchWords } from '@/features/payload-cms/search/search-text';
import type { SiteSearchResponse } from '@/features/payload-cms/search/search-types';
import { buildSearchQueryString } from '@/features/payload-cms/search/search-types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

/** Short enough to feel instant, long enough not to query for every key typed. */
export const QUERY_DELAY_MS = 200;
/** One letter matches nearly everything; it only makes the list jump. */
export const MIN_QUERY_LENGTH = 2;
const RESULTS_PER_PAGE = 20;

/**
 * What the search shows. `loading` covers the time between a keystroke and its answer, so a
 * changed query never shows the results of the one before it.
 */
export type LiveSearchStatus = 'idle' | 'loading' | 'offline' | 'error' | 'ready';

export interface LiveSearch {
  draft: string;
  setDraft: (draft: string) => void;
  filters: SearchFilters;
  setFilters: (change: Partial<SearchFilters>) => void;
  page: number;
  setPage: (page: number) => void;
  status: LiveSearchStatus;
  /** the answer for exactly the query and filters on screen, undefined while it is on its way */
  response: SiteSearchResponse | undefined;
  /** the words of the query the response answers, for highlighting */
  words: string[];
  retry: () => void;
}

/** Keeps the query string in step without a server round trip, so a search stays shareable. */
const useSearchInUrl = (queryString: string): void => {
  const pathname = usePathname();
  useEffect(() => {
    if (globalThis.location.search === `?${queryString}`) return;
    // Next.js picks up the native history API in useSearchParams and requests nothing
    globalThis.history.replaceState(undefined, '', `${pathname}?${queryString}`);
  }, [pathname, queryString]);
};

/**
 * The search page's query, filters and results, answered while the visitor types. The server
 * renders the first answer; every later one comes from the search query of the API, which the
 * instant search in the header uses too, so a query searched there is already cached here.
 */
export const useLiveSearch = (
  locale: Locale,
  initial: { query: string; filters: SearchFilters; page: number; response: SiteSearchResponse },
): LiveSearch => {
  const trpc = useTRPC();
  const isOnline = useOnlineStatus();
  const [draft, setDraft] = useState(initial.query);
  const [filters, setFilters] = useState(initial.filters);
  const [page, setPage] = useState(initial.page);

  const trimmed = draft.trim();
  const query = useDebouncedValue(trimmed, QUERY_DELAY_MS);
  const isTyping = trimmed !== query;
  const isSearchable = query.length >= MIN_QUERY_LENGTH;

  const isInitial =
    query === initial.query &&
    page === initial.page &&
    filters.sort === initial.filters.sort &&
    filters.period === initial.filters.period &&
    filters.types.join(',') === initial.filters.types.join(',');

  const result = useQuery(
    trpc.search.getSearchResultList.queryOptions(
      { locale, query, ...filters, page, pageSize: RESULTS_PER_PAGE },
      {
        enabled: isSearchable && isOnline,
        ...(isInitial ? { initialData: initial.response } : {}),
        staleTime: 60_000,
        // a search is asked once and forgotten; it has no place in the cache kept offline
        meta: { persist: false },
      },
    ),
  );

  useSearchInUrl(buildSearchQueryString({ query: trimmed, ...filters, page }));

  const response = isTyping || !isSearchable ? undefined : result.data;
  let status: LiveSearchStatus = 'loading';
  if (trimmed.length < MIN_QUERY_LENGTH) status = 'idle';
  else if (response !== undefined) status = 'ready';
  else if (!isOnline) status = 'offline';
  else if (!isTyping && result.isError) status = 'error';

  return {
    draft,
    setDraft: (next: string): void => {
      setDraft(next);
      setPage(1);
    },
    filters,
    setFilters: (change: Partial<SearchFilters>): void => {
      setFilters((current) => ({ ...current, ...change }));
      setPage(1);
    },
    page,
    setPage,
    status,
    response,
    words: parseSearchWords(query),
    retry: (): void => {
      void result.refetch();
    },
  };
};
