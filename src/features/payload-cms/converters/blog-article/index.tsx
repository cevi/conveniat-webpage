import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Blog, Image as PayloadImage } from '@/features/payload-cms/payload-types';
import type { Locale, SearchParameters, StaticTranslationString } from '@/types/types';
import { formatBlogDate } from '@/utils/format-blog-date';
import { ChevronsLeft } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

const backToOverviewText: StaticTranslationString = {
  en: 'Back to overview',
  de: 'Zurück zur Übersicht',
  fr: "Retour à l'aperçu",
};

export const BlogArticleConverter: React.FC<{
  article: Blog;
  locale: Locale;
  searchParams: SearchParameters;
}> = ({ article, locale, searchParams }) => {
  if (typeof article.content.bannerImage === 'string') {
    throw new TypeError(
      'Expected bannerImage to be an object, you may got the ID instead of the object',
    );
  }

  if ((article.content.bannerImage as PayloadImage | undefined) === undefined) {
    article.content.bannerImage = {
      ...article.content.bannerImage,
      url: '/admin-block-images/single-picture-block.png',
      alt_de: 'Platzhalter Bild',
      alt_en: 'Placeholder image',
      alt_fr: 'Image de remplacement',
    };
  }

  const source = article.content.bannerImage.sizes?.large?.url ?? '';
  const altText = getImageAltInLocale(locale, article.content.bannerImage);
  const formattedDate = formatBlogDate(article.content.releaseDate, locale);

  return (
    <>
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <LinkComponent
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-2 text-red-600 transition-colors hover:text-red-700"
          >
            <ChevronsLeft className="h-4 w-4" />
            {backToOverviewText[locale]}
          </LinkComponent>
        </div>

        {/* Banner image with correct 1:2 aspect ratio */}
        <div className="text-conveniat-green relative mt-10 aspect-[1/2] w-full text-lg">
          <Image
            src={source}
            alt={altText}
            className="block rounded-2xl object-cover"
            fill
            priority
          />
        </div>

        {/* Release date */}
        <div className="mt-6 text-gray-600">{formattedDate}</div>

        {/* Article title */}
        <HeadlineH1>{article.content.blogH1}</HeadlineH1>

        <PageSectionsConverter
          blocks={article.content.mainContent as ContentBlock[]}
          locale={locale}
          searchParams={searchParams}
        />
      </article>
    </>
  );
};
