import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { SEO } from '@/features/payload-cms/payload-types';
import { metadataIconDefinitions } from '@/utils/icon-definitions';

export const generateMetadata = async (): Promise<Metadata> => {
  const payload = await getPayload({ config });

  const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';

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
      google: (googleSearchConsoleVerification ?? '') as string,
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

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },

    icons: metadataIconDefinitions,
    manifest: '/manifest.webmanifest',

    // TODO: include twitter card data
    twitter: {},
  };
};
