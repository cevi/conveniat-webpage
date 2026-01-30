import { NewsCardBlock } from '@/components/news-card';
import { getRecentBlogPostsCached } from '@/features/payload-cms/api/cached-blogs';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Blog } from '@/features/payload-cms/payload-types';
import type { Locale, LocalizedPageType, StaticTranslationString } from '@/types/types';
import { cacheLife, cacheTag } from 'next/cache';
import React from 'react';

const resentBlogsText: StaticTranslationString = {
  en: 'Recent Blog Posts',
  de: 'Aktuelle Blog Artikel',
  fr: 'Articles de blog récents',
};

export const BlogDisplay: React.FC<{ locale: Locale; blog: Blog }> = ({ locale, blog }) => {
  if (typeof blog.content.bannerImage === 'string') {
    throw new TypeError(
      'Expected bannerImage to be an object, you may got the ID instead of the object',
    );
  }

  const linkField: LinkFieldDataType = {
    type: 'reference',
    reference: {
      relationTo: 'blog',
      value: blog,
    },
  };

  return (
    <React.Fragment key={blog.seo.urlSlug}>
      <NewsCardBlock
        date={blog.content.releaseDate}
        headline={blog.content.blogH1}
        linkField={linkField}
        image={blog.content.bannerImage}
        locale={locale}
      />
    </React.Fragment>
  );
};

const getRecentBlogPostsCachedPersistent = async (
  locale: Locale,
  limit: number,
): Promise<{ docs: Blog[] }> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'blog', 'collection:blog');

  return getRecentBlogPostsCached(locale, limit);
};

export const ListBlogPosts: React.FC<LocalizedPageType> = async ({ locale }) => {
  const blogsPaged = await getRecentBlogPostsCachedPersistent(locale, 5);

  const blogs = blogsPaged.docs;

  return (
    <div className="mx-auto my-8 flex flex-col xl:my-16 2xl:my-20 2xl:mr-[-11rem] 2xl:px-8">
      <h2
        id="voluptatibus-odit-quam-nam-placeat-sed"
        className="font-heading text-conveniat-green mt-8 mb-2 max-w-4xl text-lg font-extrabold text-balance"
      >
        {resentBlogsText[locale]}
      </h2>
      <div className="grid gap-6 min-[800px]:grid-cols-2 2xl:grid-cols-3">
        {blogs.map((blog) => {
          return <BlogDisplay blog={blog} key={blog.seo.urlSlug} locale={locale} />;
        })}
      </div>
    </div>
  );
};
