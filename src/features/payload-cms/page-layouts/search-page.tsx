import { SearchResultsView } from '@/features/payload-cms/components/search/search-results-view';
import { parseSearchParameters } from '@/features/payload-cms/search/search-types';
import { searchSite } from '@/features/payload-cms/search/site-search';
import type { LocalizedPageType } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { withSpan } from '@/utils/tracing-helpers';
import type React from 'react';

const RESULTS_PER_PAGE = 20;

/**
 * The search page, at `/suche?q=…`. It reads the session to filter the results by permission, so
 * it renders per request.
 */
const SearchPage: React.FC<LocalizedPageType> = async ({
  searchParams: searchParametersPromise,
}) => {
  return await withSpan('SearchPage', async () => {
    const locale = await getLocaleFromCookies();
    const { query, page, ...filters } = parseSearchParameters(
      (await searchParametersPromise) ?? {},
    );
    const response = await searchSite(locale, {
      query,
      page,
      ...filters,
      pageSize: RESULTS_PER_PAGE,
    });

    return (
      <SearchResultsView locale={locale} query={query} filters={filters} response={response} />
    );
  });
};

export default SearchPage;
