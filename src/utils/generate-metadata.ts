import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import { SEO } from '@/payload-types';
import { metadataIconDefinitions } from '@/utils/icon-definitions';

export const generateMetadata = async (): Promise<Metadata> => {
  const payload = await getPayload({ config });

  const { defaultTitle, defaultDescription, defaultKeywords, publisher }: SEO =
    await payload.findGlobal({
      slug: 'SEO',
    });

  return {
    title: {
      default: defaultTitle,
      template: '%s | Conveniat 2027',
    },
    description: defaultDescription,
    keywords: defaultKeywords.map((keyword) => keyword.keyword),

    publisher,

    formatDetection: {
      email: true,
      address: true,
      telephone: true,
    },

    alternates: {
      canonical: '/',
      languages: {
        'en-US': '/en',
        'de-CH': '/',
        'fr-CH': '/fr',
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
