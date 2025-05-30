import { SearchBar } from '@/components/ui/search-bar';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { BlogDisplay } from '@/features/payload-cms/components/content-blocks/list-blog-articles';
import { PageDisplay } from '@/features/payload-cms/components/content-blocks/page-display';
import type { Blog, GenericPage, Permission } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { hasPermissions } from '@/utils/has-permissions';
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

const SearchPage: React.FC<{
  searchParams: Promise<{
    q: string;
  }>;
}> = async (properties) => {
  const { searchParams: searchParametersPromise } = properties;

  const locale = await getLocaleFromCookies();

  const payload = await getPayload({ config });
  const searchParameters = await searchParametersPromise;
  const searchQuery = searchParameters['q'];

  if (searchQuery.trim() === '') {
    return (
      <article className="mx-auto my-8 max-w-2xl px-8">
        <HeadlineH1>{searchNoSearchQuery[locale]}</HeadlineH1>
        <SearchBar initialQuery={searchQuery} />
      </article>
    );
  }

  const currentDate = new Date().toISOString();

  // search for search_content and search_title
  const searchCollectionEntriesResult = await payload.find({
    collection: 'search-collection',
    depth: 1,
    limit: 10,
    locale,
    where: {
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
  });
  const searchCollectionEntries = searchCollectionEntriesResult.docs;

  const blogsPublished = await Promise.all(
    searchCollectionEntries.map(async (entry) => {
      if (entry.doc.relationTo !== 'blog') {
        // for now, only blogs give a result
        return;
      }

      // fetch the blog article and check if the release date is in the past
      const blogArticleResult = await payload.find({
        collection: 'blog',
        depth: 1,
        limit: 1,
        locale,
        where: {
          and: [
            {
              id: {
                equals: entry.doc.value,
              },
            },
            {
              'content.releaseDate': {
                less_than_equal: currentDate,
              },
            },
          ],
        },
      });
      if (blogArticleResult.docs.length > 0) {
        return blogArticleResult.docs[0];
      }

      return;
    }),
  );

  const blogs = blogsPublished.filter((blog) => blog !== undefined) as Blog[];
  const blogsPermissions = await Promise.all(
    blogs.map((blog) => hasPermissions(blog.content.permissions as Permission)),
  );
  const permittedBlogs = blogs.filter((_, index) => blogsPermissions[index]);

  const pagesPublished = await Promise.all(
    searchCollectionEntries.map(async (entry) => {
      if (entry.doc.relationTo !== 'generic-page') {
        // for now, only blogs give a result
        return;
      }

      // fetch the blog article and check if the release date is in the past
      const pagesResult = await payload.find({
        collection: 'generic-page',
        depth: 1,
        limit: 1,
        locale,
        where: {
          and: [
            {
              id: {
                equals: entry.doc.value,
              },
            },
            {
              'content.releaseDate': {
                less_than_equal: currentDate,
              },
            },
          ],
        },
      });
      if (pagesResult.docs.length > 0) {
        return pagesResult.docs[0];
      }

      return;
    }),
  );
  const pages = pagesPublished.filter((page) => page !== undefined) as GenericPage[];
  const pagesPermissions = await Promise.all(
    pages.map((page) => hasPermissions(page.content.permissions as Permission)),
  );
  const permittedPages = pages.filter((_, index) => pagesPermissions[index]);

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>
        {searchResultHeader[locale]} &#39;{searchQuery}&#39;
      </HeadlineH1>

      <SearchBar initialQuery={searchQuery} />

      <div className="mx-auto my-8 grid gap-y-6 min-[1200px]:grid-cols-2">
        <div className="col-span-2">
          <h2 className="text-2xl font-bold">{searchResultsTitlePages[locale]}</h2>
          {permittedPages.length === 0 && <p>{searchResultNoResults[locale]}</p>}
          {permittedPages.map((page) => {
            return <PageDisplay page={page} key={page.seo.urlSlug} />;
          })}
        </div>
        <div className="col-span-2">
          <h2 className="text-2xl font-bold">{searchResultsTitleBlog[locale]}</h2>
          {permittedBlogs.length === 0 && <p>{searchResultNoResults[locale]}</p>}
          {permittedBlogs.map((blog) => {
            return <BlogDisplay blog={blog} key={blog.seo.urlSlug} />;
          })}
        </div>
      </div>
    </article>
  );
};

export default SearchPage;
