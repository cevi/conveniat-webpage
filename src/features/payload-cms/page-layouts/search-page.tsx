import { LinkComponent } from '@/components/ui/link-component';
import { SearchBar } from '@/components/ui/search-bar';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { BlogDisplay } from '@/features/payload-cms/components/content-blocks/list-blog-articles';
import { PageDisplay } from '@/features/payload-cms/components/content-blocks/page-display';
import SearchOnlyBlog from '@/features/payload-cms/components/search/search-blog';
import SearchOnlyPages from '@/features/payload-cms/components/search/search-page';
import type {
  Blog,
  GenericPage,
  Permission,
  SearchCollection,
} from '@/features/payload-cms/payload-types';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import type { Locale, LocalizedPageType, StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { hasPermissions } from '@/utils/has-permissions';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
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

const searchResultsTitleBlog: StaticTranslationString = {
  de: 'Blog-Beiträge',
  en: 'Blog-Posts',
  fr: 'Articles de blog',
};

const searchResultsTitlePages: StaticTranslationString = {
  de: 'Seiten',
  en: 'Pages',
  fr: 'Pages',
};

const searchNoSearchQuery: StaticTranslationString = {
  de: 'Gib einen Suchbegriff ein',
  en: 'Please enter a search term',
  fr: 'Veuillez entrer un terme de recherche',
};

const searchMoreButton: StaticTranslationString = {
  de: 'Mehr',
  en: 'More',
  fr: 'Plus',
};

const searchNoResultsSuggestion: StaticTranslationString = {
  de: 'Versuche es mit einem anderen Suchbegriff.',
  en: 'Try another search term.',
  fr: 'Essayez avec un autre terme de recherche.',
};

const renderPermittedPage = (locale: Locale, page: GenericPage): React.JSX.Element => (
  <PageDisplay page={page} key={page.seo.urlSlug} locale={locale} />
);

const renderPermittedBlog = (locale: Locale, blog: Blog): React.JSX.Element => (
  <BlogDisplay blog={blog} key={blog.seo.urlSlug} locale={locale} />
);

const renderNoResults = (locale: Locale): React.JSX.Element => (
  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
    <div className="mb-4 rounded-full bg-gray-200 p-4">
      <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-700">{searchResultNoResults[locale]}</h3>
    <p className="mt-2 text-gray-500">{searchNoResultsSuggestion[locale]}</p>
  </div>
);

const SearchPage: React.FC<LocalizedPageType> = async ({
  searchParams: searchParametersPromise,
}) => {
  return await withSpan('SearchPage', async () => {
    const locale = await getLocaleFromCookies();

    const payload = await getPayload({ config });
    const searchParameters = await searchParametersPromise;

    if (searchParameters === undefined) {
      return (
        <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
          <HeadlineH1>{searchNoSearchQuery[locale]}</HeadlineH1>
          <SearchBar initialQuery={''} actionURL={'/search'} />
        </article>
      );
    }
    const searchQueryQ = searchParameters['q'];
    const searchQueryOnly = searchParameters['only'];

    const actionURL = specialPagesTable['search']?.alternatives[locale] ?? '/search';

    const searchQuery = Array.isArray(searchQueryQ)
      ? (searchQueryQ[0] ?? '')
      : (searchQueryQ ?? '');

    if (searchQuery.trim() === '') {
      return (
        <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
          <HeadlineH1>{searchNoSearchQuery[locale]}</HeadlineH1>
          <SearchBar initialQuery={''} actionURL={actionURL} />
        </article>
      );
    }

    if (searchQueryOnly === 'pages') {
      return <SearchOnlyPages searchParameters={searchParameters} />;
    } else if (searchQueryOnly === 'blogs') {
      return <SearchOnlyBlog searchParameters={searchParameters} />;
    }

    const limitPerCategory = 5;

    const currentDate = new Date().toISOString();

    const searchEntriesPages = await payload.find({
      collection: 'search-collection',
      depth: 0,
      limit: 5,
      locale,
      where: {
        and: [
          {
            or: [
              {
                search_content: {
                  like: searchQuery,
                },
              },
              {
                search_title: {
                  like: searchQuery,
                },
              },
            ],
          },
          {
            'doc.relationTo': { equals: 'generic-page' },
          },
        ],
      },
    });
    const searchPageIDs = searchEntriesPages.docs.map(
      (searchEntry: SearchCollection) => searchEntry.doc.value,
    );

    const pages = await payload.find({
      collection: 'generic-page',
      locale,
      where: {
        and: [
          { id: { in: searchPageIDs } },
          { 'content.releaseDate': { less_than_equal: currentDate } },
          { _localized_status: { equals: { published: true } } },
        ],
      },
    });

    const searchEntriesBlogs = await payload.find({
      collection: 'search-collection',
      depth: 0,
      limit: limitPerCategory,
      locale,
      where: {
        and: [
          {
            or: [
              {
                search_content: {
                  like: searchQuery,
                },
              },
              {
                search_title: {
                  like: searchQuery,
                },
              },
            ],
          },
          {
            'doc.relationTo': { equals: 'blog' },
          },
        ],
      },
    });

    const searchBlogIDs = searchEntriesBlogs.docs.map(
      (searchEntry: SearchCollection) => searchEntry.doc.value,
    );

    const blogs = await payload.find({
      collection: 'blog',
      locale,
      where: {
        and: [
          { id: { in: searchBlogIDs } },
          { 'content.releaseDate': { less_than_equal: currentDate } },
          { _localized_status: { equals: { published: true } } },
        ],
      },
    });

    const blogsPermissions = await Promise.all(
      blogs.docs.map((blog) => hasPermissions(blog.content.permissions as Permission)),
    );
    const permittedBlogs = blogs.docs.filter((_, index) => blogsPermissions[index] ?? false);

    const pagesPermissions = await Promise.all(
      pages.docs.map((page) => hasPermissions(page.content.permissions as Permission)),
    );
    const permittedPages = pages.docs.filter((_, index) => pagesPermissions[index] ?? false);

    return (
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1>
          {searchResultHeader[locale]} &#39;{searchQuery}&#39;
        </HeadlineH1>

        <SearchBar initialQuery={searchQuery} actionURL={actionURL} />

        <div className="mx-auto my-8 grid gap-y-6 min-[1200px]:grid-cols-2">
          <div className="col-span-2 flex flex-col gap-y-4">
            <h2 className="text-conveniat-green text-2xl font-bold">
              {searchResultsTitlePages[locale]}
            </h2>
            {permittedPages.length === 0 && renderNoResults(locale)}
            {permittedPages.map((element) => renderPermittedPage(locale, element))}
            {searchEntriesPages.totalPages > 1 && (
              <LinkComponent
                href={`?q=${searchQuery}&only=pages`}
                className="rounded-[8px] bg-green-600 px-4 py-2 text-white hover:bg-green-700 hover:text-white"
              >
                {searchMoreButton[locale]}
              </LinkComponent>
            )}
          </div>
          <div className="col-span-2 flex flex-col gap-y-4">
            <h2 className="text-conveniat-green text-2xl font-bold">
              {searchResultsTitleBlog[locale]}
            </h2>
            {permittedBlogs.length === 0 && renderNoResults(locale)}
            {permittedBlogs.map((element) => renderPermittedBlog(locale, element))}
            {searchEntriesBlogs.totalPages > 1 && (
              <LinkComponent
                href={`?q=${searchQuery}&only=blogs`}
                className="rounded-[8px] bg-green-600 px-4 py-2 text-white hover:bg-green-700 hover:text-white"
              >
                {searchMoreButton[locale]}
              </LinkComponent>
            )}
          </div>
        </div>
      </article>
    );
  });
};

export default SearchPage;
