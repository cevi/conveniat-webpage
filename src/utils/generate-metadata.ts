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

      alternates: {
        canonical: APP_HOST_URL,
        languages: {
          en: APP_HOST_URL + '/en',
          de: APP_HOST_URL + '/de',
          fr: APP_HOST_URL + '/fr',
        },
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
