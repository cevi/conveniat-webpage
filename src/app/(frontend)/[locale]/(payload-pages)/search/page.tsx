import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { BlogDisplay } from '@/features/payload-cms/components/content-blocks/list-blog-articles';
import type { Blog, GenericPage } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import { getPayload } from 'payload';
import React from 'react';

const searchResultHeader: StaticTranslationString = {
  de: 'Suchresultate für ',
  en: 'Search results for ',
  fr: 'Résultats de la recherche pour ',
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

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>
        {searchResultHeader[locale]} &#39;{searchQuery}&#39;
      </HeadlineH1>
      <div className="mx-auto my-8 grid gap-y-6 min-[1200px]:grid-cols-2">
        <div className="col-span-2">
          <h2 className="text-2xl font-bold">Pages</h2>
          {pages.length === 0 && <p>No pages found</p>}
          {pages.map((page) => {
            return (
              <div key={page.seo.urlSlug} className="my-4">
                <h3 className="text-xl font-bold">{page.content.pageTitle}</h3>
                <p>{page.seo.metaDescription}</p>
              </div>
            );
          })}
        </div>
        <h2 className="col-span-2 text-2xl font-bold">Blogs</h2>
        {blogs.length === 0 && <p>No blogs found</p>}
        {blogs.map((blog) => {
          return <BlogDisplay blog={blog} key={blog.seo.urlSlug} />;
        })}
      </div>
    </article>
  );
};

export default SearchPage;
