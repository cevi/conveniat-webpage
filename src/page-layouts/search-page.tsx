import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LocalizedPage } from './localized-page';
import Link from 'next/link';
import { ParagraphText } from '@/components/typography/paragraph-text';
import { NewsCard } from '@/components/news-card';
import Image from 'next/image';
import { Blog } from '@/payload-types';

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
          if (typeof blog.content.bannerImage === 'string') {
            throw new TypeError(
              'Expected bannerImage to be an object, you may got the ID instead of the object',
            );
          }

          const source = blog.content.bannerImage.url ?? '/images/placeholder.png';
          const altText = blog.content.bannerImage.alt;

          return (
            <React.Fragment key={blog.seo.urlSlug}>
              <Link href={`/blog/${blog.seo.urlSlug}`} key={blog.id}>
                <NewsCard date={blog.updatedAt} headline={blog.content.blogH1}>
                  <ParagraphText> {blog.content.blogShortTitle} </ParagraphText>
                  <Image
                    className="w-full rounded-lg object-cover"
                    src={source}
                    alt={altText}
                    width={1200}
                    height={800}
                  />
                </NewsCard>
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    </article>
  );
};
