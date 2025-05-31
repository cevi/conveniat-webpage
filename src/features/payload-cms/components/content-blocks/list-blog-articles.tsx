import { NewsCard } from '@/components/news-card';
import type { Blog } from '@/features/payload-cms/payload-types';
import type { LocalizedPageType, StaticTranslationString } from '@/types/types';
import config from '@payload-config';
import Image from 'next/image';
import Link from 'next/link';
import { getPayload } from 'payload';
import React from 'react';

const resentBlogsText: StaticTranslationString = {
  en: 'Recent Blog Posts',
  de: 'Aktuelle Blog Artikel',
  fr: 'Articles de blog récents',
};

export const BlogDisplay: React.FC<{ blog: Blog }> = ({ blog }) => {
  if (typeof blog.content.bannerImage === 'string') {
    throw new TypeError(
      'Expected bannerImage to be an object, you may got the ID instead of the object',
    );
  }
  const source = blog.content.bannerImage.url ?? '/images/placeholder.png';
  // the alt text may be not defined in all locales
  const altText = blog.content.bannerImage.alt as string | undefined;
  return (
    <React.Fragment key={blog.seo.urlSlug}>
      <Link href={`/blog/${blog.seo.urlSlug}`} key={blog.id}>
        <NewsCard date={blog.content.releaseDate} headline={blog.content.blogH1}>
          <Image
            className="w-full object-cover"
            src={source}
            alt={altText ?? 'Blog post banner image'}
            width={1200}
            height={800}
          />
        </NewsCard>
      </Link>
    </React.Fragment>
  );
};

export const ListBlogPosts: React.FC<LocalizedPageType> = async ({ locale }) => {
  const payload = await getPayload({ config });
  const currentDate = new Date().toISOString();
  const blogsPaged = await payload.find({
    collection: 'blog',
    where: {
      and: [
        {
          _localized_status: {
            equals: {
              published: true,
            },
          },
        },
        {
          'content.releaseDate': {
            less_than_equal: currentDate,
          },
        },
      ],
    },
    locale: locale,
    limit: 5,
  });

  const blogs = blogsPaged.docs as Blog[];

  return (
    <div className="mx-auto flex flex-col my-8 xl:my-16 2xl:my-20 2xl:mr-[-11rem] 2xl:px-8">
      <h2
        id="voluptatibus-odit-quam-nam-placeat-sed"
        className="mb-2 mt-8 max-w-4xl text-balance font-heading text-lg font-extrabold text-conveniat-green"
      >
        {resentBlogsText[locale]}
      </h2>
      <div className="grid gap-6 min-[800px]:grid-cols-2 2xl:grid-cols-3">
        {blogs.map((blog) => {
          return <BlogDisplay blog={blog} key={blog.seo.urlSlug} />;
        })}
      </div>
    </div>
  );
};
