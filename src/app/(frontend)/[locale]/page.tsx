import config from '@payload-config';
import { getPayload } from 'payload';

import '../globals.scss';
import React from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { TeaserText } from '@/components/typography/teaser-text';
import { CallToAction } from '@/components/buttons/call-to-action';
import { BuildingBlocks, ContentBlock } from '@/converters/building-blocks';

/**
 * This file is responsible for converters the landing page.
 * All other pages are rendered by `/src/app/(frontend)/[locale]/[...slugs]/blog-posts.tsx`
 *
 * @param params - The parameters for the page route
 *
 */
const LandingPage: React.FC<{
  params: Promise<{
    locale: 'de' | 'en' | 'fr';
  }>;
}> = async ({ params }) => {
  const { locale } = await params;

  const payload = await getPayload({ config });
  const { content } = await payload.findGlobal({
    slug: 'landingPage',
    locale: locale,
  });
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

export const dynamic = 'force-dynamic';
export default LandingPage;
