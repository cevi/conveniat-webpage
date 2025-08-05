'use client';

import { SearchBar } from '@/components/ui/search-bar';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { PageDisplay } from '@/features/payload-cms/components/content-blocks/page-display';
import type { GenericPage, SearchCollection } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import React from 'react';

const searchResultHeader: StaticTranslationString = {
  de: 'Suchresultate für ',
  en: 'Search results for ',
  fr: 'Résultats de la recherche pour ',
};

const searchResultNoResults: StaticTranslationString = {
  de: 'Keine Resultate gefunden.',
  en: 'No results found.',
  fr: 'Aucun résultat trouvé.',
};

const searchResultsTitlePages: StaticTranslationString = {
  de: 'Seiten',
  en: 'Pages',
  fr: 'Pages',
};

interface PaginatedDocuments {
  docs: SearchCollection[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
  nextPage?: null | number | undefined;
  page?: number;
  pagingCounter: number;
  prevPage?: null | number | undefined;
  totalDocs: number;
  totalPages: number;
}

const SearchOnlyPagesClient: React.FC<{
  searchCollectionEntries: PaginatedDocuments;
  permittedPages: GenericPage[];
  locale: Locale;
  searchQuery: string;
  page: number;
}> = ({
  searchCollectionEntries,
  locale,
  searchQuery,
  permittedPages,
  page,
}): React.JSX.Element => {
  const { totalPages, hasPrevPage, hasNextPage, prevPage, nextPage } = searchCollectionEntries;

  // Build query string for pagination links
  const buildPageLink = (targetPage: number | undefined | null): string => {
    const newSearchParameters = new URLSearchParams();
    newSearchParameters.set('q', searchQuery);
    newSearchParameters.set('only', 'pages');
    newSearchParameters.set('page', String(targetPage));
    return `/search?${newSearchParameters.toString()}`;
  };

  return (
    <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <HeadlineH1>
        {searchResultHeader[locale]} &#39;{searchQuery}&#39;
      </HeadlineH1>
      <SearchBar initialQuery={searchQuery} actionURL="/search" />

      <div className="my-8 flex flex-col gap-y-4">
        <h2 className="text-2xl font-bold">{searchResultsTitlePages[locale]}</h2>
        {permittedPages.length === 0 && <p>{searchResultNoResults[locale]}</p>}
        {permittedPages.map((permittedPage) => (
          <PageDisplay page={permittedPage} key={permittedPage.seo.urlSlug} />
        ))}
      </div>

      <nav className="mt-8 flex justify-between">
        <button
          disabled={!hasPrevPage}
          className="rounded bg-gray-200 px-4 py-2 disabled:opacity-50"
          onClick={() => (globalThis.location.href = buildPageLink(prevPage))}
        >
          &larr; Prev
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          disabled={!hasNextPage}
          className="rounded bg-gray-200 px-4 py-2 disabled:opacity-50"
          onClick={() => (globalThis.location.href = buildPageLink(nextPage))}
        >
          Next &rarr;
        </button>
      </nav>
    </article>
  );
};

export default SearchOnlyPagesClient;
