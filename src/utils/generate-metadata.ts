import { environmentVariables } from '@/config/environment-variables';
import { getSEOCached } from '@/features/payload-cms/api/cached-globals';
import { metadataIconDefinitions } from '@/utils/icon-definitions';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { withSpan } from '@/utils/tracing-helpers';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

export const generateMetadataCached = async (): Promise<Metadata> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'PWA-v8', 'SEO');

  return await withSpan('generateMetadataCached', async () => {
    const APP_HOST_URL = environmentVariables.APP_HOST_URL;

    const {
      defaultTitle,
      defaultDescription,
      defaultKeywords,
      publisher,
      googleSearchConsoleVerification,
    } = await getSEOCached();

    const keywords = Array.isArray(defaultKeywords)
      ? defaultKeywords.map((keyword) => keyword.keyword)
      : [];

    return {
      // Resolves the relative canonical and language links of the pages to the absolute URLs
      // Google requires. Pages set their own; a default here would tell search engines every
      // page without one is a copy of the landing page.
      metadataBase: APP_HOST_URL,

      title: {
        default: defaultTitle || 'conveniat27',
        template: '%s | conveniat27',
      },
      description: defaultDescription,
      keywords,

      publisher,

      openGraph: {
        type: 'website',
        title: defaultTitle,
        description: defaultDescription,
      },

      verification: {
        google: googleSearchConsoleVerification,
      },

      formatDetection: {
        email: true,
        address: true,
        telephone: true,
      },

      icons: metadataIconDefinitions,

      twitter: {
        card: 'summary',
        description: defaultDescription,
      },
    };
  });
};

export const generateMetadata = async (): Promise<Metadata> => {
  if (await forceDynamicOnBuild()) return {};
  return generateMetadataCached();
};
