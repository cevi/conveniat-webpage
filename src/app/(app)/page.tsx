import config from '@payload-config';
import { getPayload } from 'payload';

import './globals.css';
import Image from 'next/image';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { TeaserText } from '@/components/typography/teaser-text';
import { CallToAction } from '@/components/buttons/call-to-action';
import { SubheadingH2 } from '@/components/typography/subheading-h2';
import { ParagraphText } from '@/components/typography/paragraph-text';
import { SubheadingH3 } from '@/components/typography/subheading-h3';
import Link from 'next/link';
import { LexicalPageContent } from '@/components/lexical-page-content';
import { NewsCard } from '@/components/news-card';

const Page: React.FC = async () => {
  const payload = await getPayload({ config });

  const { pageTitle, pageContent } = await payload.findGlobal({
    slug: 'landingPage',
  });

  const blogsPaged = await payload.find({
    collection: 'blog',
    where: {
      _localized_status: {
        equals: {
          published: true,
        },
      },
    },
    limit: 5,
  });

  const blogs = blogsPaged.docs;

  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>{pageTitle}</HeadlineH1>

      <TeaserText>
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.
      </TeaserText>

      <CallToAction>Erfahre mehr &gt;</CallToAction>

      <ParagraphText>
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.
      </ParagraphText>

      <SubheadingH2>Apparently we had reached a great height.</SubheadingH2>

      <ParagraphText>
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.{' '}
        <Link href="/" className="font-bold text-red-600">
          Read more...
        </Link>
      </ParagraphText>

      <ParagraphText>
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.
      </ParagraphText>

      <div className="-mx-[8px] my-[32px] bg-white">
        <Image
          className="rounded-[16px]"
          src="/imgs/big-tent.png"
          alt="Konekta 2024"
          width={1200}
          height={800}
        />
      </div>

      <ParagraphText>
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.
      </ParagraphText>

      <NewsCard date={new Date()} headline="This is a Second Message">
        <ParagraphText>
          Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
          and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the
          sea to the level of the spectato.
        </ParagraphText>

        <Image
          className="rounded-[8px]"
          src="/imgs/big-tent.png"
          alt="Konekta 2024"
          width={1200}
          height={800}
        />
      </NewsCard>

      <NewsCard date={new Date()} headline="This is a Second Message">
        <ParagraphText>
          Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
          and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the
          sea to the level of the spectato.
        </ParagraphText>

        <Image
          className="rounded-[8px]"
          src="/imgs/big-tent.png"
          alt="Konekta 2024"
          width={1200}
          height={800}
        />
      </NewsCard>

      <SubheadingH3>Apparently we had reached a great height.</SubheadingH3>

      <ParagraphText>
        Apparently we had reached a great height in the atmosphere, for the sky was a dead black,
        and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea
        to the level of the spectato.
      </ParagraphText>

      <hr />

      <LexicalPageContent pageContent={pageContent} />

      <hr />

      <SubheadingH2> Another Subheading</SubheadingH2>

      <div className="mb-16 mt-8 flex flex-col items-center justify-center space-y-4 text-center">
        <span className="text-cite text-conveniat-text max-w-xl font-['Solitreo'] font-normal">
          We of the sea to the level of the spectato. Apparently we had reached a great height in
          the atmosphere. For the sky.
        </span>
        <div className="flex flex-col items-center justify-center space-y-0 text-center">
          <span className="text-conveniat-text">Hans Muser v/o Musterli</span>
          <span className="text-conveniat-text">Teilnehmer Conveniat 2027</span>
        </div>
      </div>

      <SubheadingH2> Latest Blog Articles</SubheadingH2>

      <div className="mx-auto my-[32px] grid gap-y-6 min-[1200px]:grid-cols-2">
        {blogs.map((blog) => (
          <React.Fragment key={blog.urlSlug}>
            <Link href={`/blog/${blog.urlSlug}`} key={blog.urlSlug}>
              <NewsCard date={new Date(blog.updatedAt)} headline={blog.blogH1}>
                <ParagraphText>{blog.blogH1}</ParagraphText>

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
    </article>
  );
};

export const dynamic = 'force-dynamic';
export default Page;
