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
  cacheTag('payload', 'global:SEO');

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

      // iOS Safari wraps whatever looks like a phone number, address, date or
      // email in a link before React hydrates, and the changed text node fails
      // hydration (React #418, issue #2726): the IBAN and the bank address on
      // /spenden read as a phone number and an address. Next.js writes a key
      // into the meta tag only when it is `false`, so `true` left every
      // detector on. Everything we want tappable is an explicit link already:
      // rich text, chat messages and the Notfall screen render `tel:` and
      // `mailto:` themselves.
      formatDetection: {
        telephone: false,
        date: false,
        address: false,
        email: false,
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
