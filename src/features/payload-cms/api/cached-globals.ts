import type { AlertSetting, Footer, Header, SEO } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
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
  return await withSpan('getFooterCached', async () => {
    const payload = await getPayload({ config });
    return await payload.findGlobal({
      slug: 'footer',
      locale,
      select: {
        minimalFooterMenu: true,
        socialLinks: true,
        sponsors: true,
      },
    });
  });
});

/**
 * Fetches the Header global with request-level memoization.
 */
export const getHeaderCached = cache(
  async (locale: Locale, draft: boolean = false): Promise<Header> => {
    return await withSpan('getHeaderCached', async () => {
      const payload = await getPayload({ config });
      return await payload.findGlobal({
        slug: 'header',
        locale,
        draft,
        select: {
          mainMenu: true,
        },
      });
    });
  },
);

/**
 * Fetches the SEO global with request-level memoization.
 */
export const getSEOCached = cache(async (): Promise<SEO> => {
  return await withSpan('getSEOCached', async () => {
    const payload = await getPayload({ config });
    return await payload.findGlobal({
      slug: 'SEO',
      select: {
        defaultTitle: true,
        defaultDescription: true,
        defaultKeywords: true,
        publisher: true,
        googleSearchConsoleVerification: true,
      },
    });
  });
});

/**
 * Fetches the Alert Settings global with request-level memoization.
 */
export const getAlertSettingsCached = cache(
  async (
    locale: Locale,
    draft: boolean = false,
    fallbackLocale: Locale = 'de',
  ): Promise<AlertSetting> => {
    return await withSpan('getAlertSettingsCached', async () => {
      const payload = await getPayload({ config });
      return await payload.findGlobal({
        slug: 'alert_settings',
        locale,
        draft,
        fallbackLocale,
        select: {
          questions: true,
        },
      });
    });
  },
);
