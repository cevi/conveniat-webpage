'use client';

import { LinkComponent } from '@/components/ui/link-component';
import { SearchBar } from '@/components/ui/search-bar';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import PageDisplayClient from '@/features/payload-cms/components/search/page-display-client';
import type { GenericPage } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { MoveLeft, MoveRight } from 'lucide-react';
import type { PaginatedDocs } from 'payload';
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
  permittedPages: GenericPage[];
  pages: PaginatedDocs<GenericPage>;
}> = ({ locale, page, searchQuery, permittedPages, pages }): React.JSX.Element => {
  const { totalPages, hasPrevPage, hasNextPage, prevPage, nextPage } = pages;

  const buildPageLink = (targetPage: number | undefined | null): string => {
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
        {permittedPages.length === 0 && <p>{searchResultNoResults[locale]}</p>}
        {permittedPages.map((permittedPage) => (
          <PageDisplayClient key={permittedPage.id} page={permittedPage} locale={locale} />
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
