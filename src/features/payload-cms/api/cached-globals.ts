import type { Footer, Header, SEO } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches the Footer global with request-level memoization.
 *
 * This ensures that multiple components asking for the footer within the same
 * request will share the same database query result.
 */
export const getFooterCached = cache(async (locale: Locale): Promise<Footer> => {
  const payload = await getPayload({ config });
  return await payload.findGlobal({
    slug: 'footer',
    locale,
  });
});

/**
 * Fetches the Header global with request-level memoization.
 */
export const getHeaderCached = cache(
  async (locale: Locale, draft: boolean = false): Promise<Header> => {
    const payload = await getPayload({ config });
    return await payload.findGlobal({
      slug: 'header',
      locale,
      draft,
    });
  },
);

/**
 * Fetches the SEO global with request-level memoization.
 */
export const getSEOCached = cache(async (): Promise<SEO> => {
  const payload = await getPayload({ config });
  return await payload.findGlobal({
    slug: 'SEO',
  });
});
