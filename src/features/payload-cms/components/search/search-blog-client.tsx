'use client';

import { LinkComponent } from '@/components/ui/link-component';
import { SearchBar } from '@/components/ui/search-bar';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import BlogDisplayClient from '@/features/payload-cms/components/search/blog-display-client';
import type { Blog } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { MoveLeft, MoveRight } from 'lucide-react';
import type { PaginatedDocs } from 'payload';

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
  de: 'Alle Blogs',
  en: 'All Blogs',
  fr: 'Touts Blogs',
};

const nextButton: StaticTranslationString = {
  de: 'Nächste Seite',
  en: 'Next Page',
  fr: 'Page suivante',
};

const previousButton: StaticTranslationString = {
  de: 'Vorherige Seite',
  en: 'Previous Page',
  fr: 'Page précédente',
};

const SearchOnlyBlogsClient: React.FC<{
  locale: Locale;
  page: number;
  searchQuery: string;
  permittedBlogs: Blog[];
  blogs: PaginatedDocs<Blog>;
}> = ({ locale, page, searchQuery, permittedBlogs, blogs }): React.JSX.Element => {
  const { totalPages, hasPrevPage, hasNextPage, prevPage, nextPage } = blogs;

  const searchAlternatives = {
    en: '/search',
    de: '/suche',
    fr: '/recherche',
  };

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
        {permittedBlogs.length === 0 && <p>{searchResultNoResults[locale]}</p>}
        {permittedBlogs.map((permittedBlog) => (
          <BlogDisplayClient key={permittedBlog.id} blog={permittedBlog} locale={locale} />
        ))}
      </div>
      <nav className="mt-8 flex justify-between">
        {hasPrevPage ? (
          <LinkComponent
            className="flex-inline flex justify-center rounded bg-gray-200 px-4 py-2"
            href={buildPageLink(prevPage)}
          >
            <MoveLeft /> {previousButton[locale]}
          </LinkComponent>
        ) : (
          <div></div>
        )}
        <span>
          {page} / {totalPages}
        </span>
        {hasNextPage ? (
          <LinkComponent
            className="flex-inline flex justify-center rounded bg-gray-200 px-4 py-2"
            href={buildPageLink(nextPage)}
          >
            {nextButton[locale]} <MoveRight />
          </LinkComponent>
        ) : (
          <div></div>
        )}
      </nav>
    </article>
  );
};

export default SearchOnlyBlogsClient;
