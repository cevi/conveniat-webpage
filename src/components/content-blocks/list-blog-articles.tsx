import { LocalizedPage } from '@/page-layouts/localized-page';
import { getPayload } from 'payload';
import config from '@payload-config';
import Link from 'next/link';
import { ParagraphText } from '@/components/typography/paragraph-text';
import { NewsCard } from '@/components/news-card';
import React from 'react';
import Image from 'next/image';
import { Blog } from '@/payload-types';

export const BlogDisplay: React.FC<{ blog: Blog }> = ({ blog }) => {
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
          <Image
            className="w-full rounded-lg object-cover"
            src={source}
            alt={altText}
            width={1200}
            height={800}
          />
          <ParagraphText> {blog.content.blogShortTitle} </ParagraphText>
        </NewsCard>
      </Link>
    </React.Fragment>
  );
};

export const ListBlogPosts: React.FC<LocalizedPage> = async ({ locale }) => {
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
    <div className="mx-auto my-8 grid gap-y-6 min-[1200px]:grid-cols-2">
      {blogs.map((blog) => {
        return <BlogDisplay blog={blog} key={blog.seo.urlSlug} />;
      })}
    </div>
  );
};
