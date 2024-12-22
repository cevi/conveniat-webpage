import { LocalizedPage } from '@/page-layouts/localized-page';
import { getPayload } from 'payload';
import config from '@payload-config';
import Link from 'next/link';
import { ParagraphText } from '@/components/typography/paragraph-text';
import { NewsCard } from '@/components/news-card';
import React from 'react';
import Image from 'next/image';

export const ListBlogPosts: React.FC<LocalizedPage> = async ({ locale }) => {
  const payload = await getPayload({ config });
  const blogsPaged = await payload.find({
    collection: 'blog',
    where: {
      _localized_status: {
        equals: {
          published: true,
        },
      },
    },
    locale: locale,
    limit: 5,
  });

  const blogs = blogsPaged.docs;

  return (
    <div className="mx-auto my-[32px] grid gap-y-6 min-[1200px]:grid-cols-2">
      {blogs.map((blog) => (
        <React.Fragment key={blog.urlSlug}>
          <Link href={`/blog/${blog.urlSlug}`} key={blog.id}>
            <NewsCard date={new Date(blog.updatedAt)} headline={blog.blogH1}>
              <ParagraphText>{blog.blogH1} </ParagraphText>
              <Image
                className="rounded-[8px]"
                src="/imgs/big-tent.png"
                alt="Konekta 2024"
                width={1200}
                height={800}
              />
            </NewsCard>
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
};
