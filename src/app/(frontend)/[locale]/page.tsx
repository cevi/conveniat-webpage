import config from '@payload-config';
import { getPayload } from 'payload';

import '../globals.scss';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { TeaserText } from '@/components/typography/teaser-text';
import { CallToAction } from '@/components/buttons/call-to-action';
import { BuildingBlocks, ContentBlock } from '@/converters/building-blocks';
import { LandingPage as LandingPagePayloadType } from '@/payload-types';
import type { Metadata } from 'next';
import { Locale } from '@/middleware';

/**
 * This function is responsible for fetching the landing page from the CMS.
 *
 * @param locale - The locale of the landing page
 */
const findLandingPage = async (locale: Locale): Promise<LandingPagePayloadType> => {
  const payload = await getPayload({ config });
  return await payload.findGlobal({
    slug: 'landingPage',
    locale,
  });
};

/**
 * This file is responsible for converters the landing page.
 * All other pages are rendered by `/src/app/(frontend)/[locale]/[...slugs]/blog-posts.tsx`
 *
 * @param params - The parameters for the page route
 *
 */
const LandingPage: React.FC<{
  params: Promise<{
    locale: Locale;
  }>;
}> = async ({ params }) => {
  const { locale } = await params;

  const { content } = await findLandingPage(locale);
  const { pageTitle, mainContent, pageTeaser, callToAction } = content;
  const { link, linkText } = callToAction;

  return (
    <article className="mx-auto my-8 max-w-5xl px-8">
      <HeadlineH1>{pageTitle}</HeadlineH1>
      <TeaserText>{pageTeaser}</TeaserText>
      <CallToAction href={link}>{linkText}</CallToAction>
      <BuildingBlocks blocks={mainContent as ContentBlock[]} locale={locale} />
    </article>
  );
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{
    locale: Locale;
  }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const { seo } = await findLandingPage(locale);

  return {
    ...(seo.metaTitle === undefined ? {} : { title: seo.metaTitle }),
    ...(seo.metaDescription === undefined ? {} : { description: seo.metaDescription }),
    ...(seo.keywords === undefined ? {} : { keywords: seo.keywords }),
  };
};

export const dynamic = 'force-dynamic';
export default LandingPage;
