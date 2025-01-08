import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LocalizedPage } from './localized-page';
import { Blog } from '@/payload-types';
import { BlogDisplay } from '@/components/content-blocks/list-blog-articles';

export const SearchPage: React.FC<LocalizedPage> = async (properties) => {
  const { locale, searchParams } = await properties;

  const payload = await getPayload({ config });
  const { content } = await payload.findGlobal({
    slug: 'search',
    locale,
  });

  const searchQuery = searchParams['q'] as string;

  const blogsPaged = await payload.find({
    collection: 'blog',
    depth: 1,
    limit: 10,
    locale,
    ...(searchQuery
      ? {
          where: {
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
        }
      : {}),
  });

  const blogs = blogsPaged.docs as Blog[];

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>
        {content.pageTitle}: {searchQuery}
      </HeadlineH1>
      <div className="mx-auto my-8 grid gap-y-6 min-[1200px]:grid-cols-2">
        {blogs.map((blog) => {
          return <BlogDisplay blog={blog} key={blog.seo.urlSlug} />;
        })}
      </div>
    </article>
  );
};
