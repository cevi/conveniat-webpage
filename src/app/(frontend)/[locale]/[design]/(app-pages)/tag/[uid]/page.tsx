import { TagContent } from '@/features/wristbands/components/tag-content';
import { TagSheet } from '@/features/wristbands/components/tag-sheet';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { DesignCodes } from '@/utils/design-codes';
import type { Metadata } from 'next';
import type React from 'react';

const tabTitle: StaticTranslationString = {
  de: 'Armband',
  en: 'Wristband',
  fr: 'Bracelet',
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // never indexed: the address names a person's band
  return { title: tabTitle[locale], robots: { index: false, follow: false } };
};

/**
 * A band loaded cold: from the home screen, or a link from outside the app. A tap inside the app
 * opens the same sheet over the open page instead, see `@modal/(.)tag/[uid]`. Here the sheet
 * stands open on the app's empty background rather than over Home: Home renders the CMS's
 * content and its own queries, which would load behind a sheet nobody reads them through.
 */
const TagPage: React.FC<{
  params: Promise<{ uid: string; locale: Locale; design: DesignCodes }>;
}> = ({ params }) => (
  <TagSheet closeTo="home">
    <TagContent params={params} />
  </TagSheet>
);

export default TagPage;
