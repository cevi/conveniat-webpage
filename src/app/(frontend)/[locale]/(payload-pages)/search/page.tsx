import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import type { Blog } from '@/payload-types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type { StaticTranslationString } from '@/types';
import { BlogDisplay } from '@/components/content-blocks/list-blog-articles';

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

  const blogsPaged = await payload.find({
    collection: 'blog',
    depth: 1,
    limit: 10,
    locale,
    ...(searchQuery === ''
      ? {}
      : {
          where: {
            and: [
              {
                'content.releaseDate': {
                  less_than_equal: currentDate,
                },
              },
              {
                or: [
                  {
                    'content.blogH1': {
                      like: searchQuery,
                    },
                  },
                  {
                    'content.blogShortTitle': {
                      like: searchQuery,
                    },
                  },
                  {
                    'content.blogSearchKeywords': {
                      like: searchQuery,
                    },
                  },
                  {
                    'seo.urlSlug': {
                      like: searchQuery,
                    },
                  },
                ],
              },
            ],
          },
        }),
  });

  const blogs = blogsPaged.docs as Blog[];

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>
        {searchResultHeader[locale]} &#39;{searchQuery}&#39;
      </HeadlineH1>
      <div className="mx-auto my-8 grid gap-y-6 min-[1200px]:grid-cols-2">
        {blogs.map((blog) => {
          return <BlogDisplay blog={blog} key={blog.seo.urlSlug} />;
        })}
      </div>
    </article>
  );
};

export default SearchPage;
