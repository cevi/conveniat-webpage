'use client';

import { LinkComponent } from '@/components/ui/link-component';
import { SearchBar } from '@/components/ui/search-bar';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import SearchResultCard from '@/features/payload-cms/components/search/search-result-card';
import type { SearchResults } from '@/features/payload-cms/components/search/search-results';
import type { Locale, StaticTranslationString } from '@/types/types';
import { MoveLeft, MoveRight } from 'lucide-react';
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
  de: 'Alle Seiten',
  en: 'All Pages',
  fr: 'Touts Pages',
};

const searchAlternatives: StaticTranslationString = {
  en: '/search',
  de: '/suche',
  fr: '/recherche',
};

const SearchOnlyPagesClient: React.FC<{
  locale: Locale;
  page: number;
  searchQuery: string;
  searchResults: SearchResults;
}> = ({ locale, page, searchQuery, searchResults }): React.JSX.Element => {
  const { results } = searchResults;
  const { totalPages, hasPrevPage, hasNextPage, prevPage, nextPage } = searchResults.pagination;

  const buildPageLink = (targetPage: number | undefined): string => {
    const newSearchParameters = new URLSearchParams();
    newSearchParameters.set('q', searchQuery);
    newSearchParameters.set('only', 'pages');
    newSearchParameters.set('page', String(targetPage));
    return `${searchAlternatives[locale]}?${newSearchParameters.toString()}`;
  };

  return (
    <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <HeadlineH1>
        {searchResultHeader[locale]} &#39;{searchQuery}&#39;
      </HeadlineH1>
      <SearchBar initialQuery={searchQuery} actionURL={searchAlternatives[locale]} />

      <div className="my-8 flex flex-col gap-y-4">
        <h2 className="text-2xl font-bold">{searchResultsTitlePages[locale]}</h2>
        {results.length === 0 && <p>{searchResultNoResults[locale]}</p>}
        {results.map((result) => (
          <SearchResultCard key={result.id} result={result} locale={locale} />
        ))}
      </div>
      <nav className="mt-8 flex justify-between">
        {hasPrevPage ? (
          <LinkComponent
            className="flex-inline bg-conveniat-green flex justify-center rounded px-4 py-2 text-white"
            href={buildPageLink(prevPage)}
          >
            <MoveLeft className="mt-0.5 mr-2" />
          </LinkComponent>
        ) : (
          <div></div>
        )}
        <span className="mt-3 text-gray-500">
          {page} / {totalPages}
        </span>
        {hasNextPage ? (
          <LinkComponent
            className="flex-inline bg-conveniat-green flex justify-center rounded px-4 py-2 text-white"
            href={buildPageLink(nextPage)}
          >
            <MoveRight className="mt-0.5 ml-2" />
          </LinkComponent>
        ) : (
          <div></div>
        )}
      </nav>
    </article>
  );
};

export default SearchOnlyPagesClient;
