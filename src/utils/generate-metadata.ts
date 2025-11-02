import { environmentVariables } from '@/config/environment-variables';
import type { SEO } from '@/features/payload-cms/payload-types';
import { metadataIconDefinitions } from '@/utils/icon-definitions';
import config from '@payload-config';
import type { Metadata } from 'next';
import { getPayload } from 'payload';

export const generateMetadata = async (): Promise<Metadata> => {
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

  const { appName } = await payload.findGlobal({
    slug: 'PWA',
  });

  return {
    title: {
      default: defaultTitle,
      template: '%s | conveniat27',
    },
    description: defaultDescription,
    keywords: defaultKeywords.map((keyword) => keyword.keyword),

    publisher,

    verification: {
      google: googleSearchConsoleVerification ?? '',
    },

    formatDetection: {
      email: true,
      address: true,
      telephone: true,
    },

    appleWebApp: {
      title: appName,
      statusBarStyle: 'black',
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
    manifest: '/manifest.webmanifest',

    twitter: {
      card: 'summary',
      description: defaultDescription,
    },
  };
};
