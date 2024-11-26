import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import { SEO } from '@/payload-types';

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

    // TODO: replace the icon urls with the actual urls / generate the corresponding files
    icons: {
      icon: [
        { url: '/icon.png' },
        new URL('/icon.png', 'https://example.com'),
        { url: '/icon-dark.png', media: '(prefers-color-scheme: dark)' },
      ],
      shortcut: ['/shortcut-icon.png'],
      apple: [
        { url: '/apple-icon.png' },
        { url: '/apple-icon-x3.png', sizes: '180x180', type: 'image/png' },
      ],
      other: {
        rel: 'apple-touch-icon-precomposed',
        url: '/apple-touch-icon-precomposed.png',
      },
    },

    manifest: '/manifest.webmanifest',

    // TODO: include twitter card data
    twitter: {},
  };
};
