import config from '@payload-config';
import { ErrorBoundary } from 'react-error-boundary';
import { getPayload } from 'payload';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LexicalPageContent } from '@/components/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TeaserText } from '@/components/typography/teaser-text';

export type LocalizedBlogPost = {
  slug?: string;
  locale: 'de' | 'en' | 'fr';
};

const mapLocale = (locale: 'de' | 'en' | 'fr'): 'de-CH' | 'fr-CH' | 'en-GB' => {
  switch (locale) {
    case 'de': {
      return 'de-CH';
    }
    case 'en': {
      return 'en-GB';
    }
    case 'fr': {
      return 'fr-CH';
    }
  }
};

const BlogPost: React.FC<LocalizedBlogPost> = async ({ slug, locale }) => {
  const payload = await getPayload({ config });

  console.log('BlogPost:', slug, locale, mapLocale(locale));

  // the id follows after ~
  const id = slug?.split('~')[1] ?? '';
  if (id === '') notFound();

  const article = await payload.findByID({
    collection: 'blog',
    id,
    locale: mapLocale(locale),
  });

  if (!article._localized_status.published) {
    // check in which locale the article is available
    const articleAllLangs = await payload.findByID({
      collection: 'blog',
      id,
      locale: 'all',
    });

    console.log('Article:', JSON.stringify(articleAllLangs._localized_status));

    return (
      <>
        <HeadlineH1>Not Found</HeadlineH1>
        <TeaserText>
          The article you are looking for does not exist in the selected language. It is available
          in:
          <ul>
            {Object.keys(articleAllLangs._localized_status)
              .filter((lang: string) => articleAllLangs._localized_status[lang].published)
              .map((lang: string) => {
                return (
                  <li>
                    <Link href="/" className="font-bold text-red-600">
                      Available in {lang}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </TeaserText>
      </>
    );
  }

  return (
    <article className="mx-auto my-8 max-w-6xl px-8">
      <HeadlineH1>{article.blogH1}</HeadlineH1>
      <LexicalPageContent pageContent={article.pageContent as SerializedEditorState} />

      <hr />
    </article>
  );
};

const Page: React.FC<{ params: Promise<{ slug: string; locale: 'de' | 'en' | 'fr' }> }> = async ({
  params,
}) => {
  const { slug, locale } = await params;

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <BlogPost slug={slug} locale={locale} />
    </ErrorBoundary>
  );
};

export default Page;
