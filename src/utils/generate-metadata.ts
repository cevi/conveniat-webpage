import { environmentVariables } from '@/config/environment-variables';
import type { SEO } from '@/features/payload-cms/payload-types';
import { metadataIconDefinitions } from '@/utils/icon-definitions';
import { isBuildTimePreRendering } from '@/utils/is-pre-rendering';
import config from '@payload-config';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';

export const generateMetadataCached = async (): Promise<Metadata> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'PWA-v8', 'SEO');

  const payload = await getPayload({ config });

  const APP_HOST_URL = environmentVariables.APP_HOST_URL;

  const {
    defaultTitle,
    defaultDescription,
    defaultKeywords,
    publisher,
    googleSearchConsoleVerification,
  }: SEO = await payload.findGlobal({
    slug: 'SEO',
  });

  return {
    title: {
      default: defaultTitle,
      template: '%s | conveniat27',
    },
    description: defaultDescription,
    keywords: (defaultKeywords || []).map((keyword) => keyword.keyword),

    publisher,

    verification: {
      google: googleSearchConsoleVerification ?? '',
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
};

export const generateMetadata = async (): Promise<Metadata> => {
  if (await isBuildTimePreRendering()) return {};
  return generateMetadataCached();
};
