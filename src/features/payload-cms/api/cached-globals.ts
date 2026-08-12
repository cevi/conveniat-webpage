import type {
  AlertSetting,
  AppFeatureFlag,
  AppLandingPage,
  Footer,
  Header,
  SEO,
} from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { isBuildPhase } from '@/utils/build-phase';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Cached readers for the Payload globals.
 *
 * Each global is read through two layers:
 *
 * 1. A persistent `'use cache'` function, so the value survives across requests. Globals change
 *    rarely (a handful of times per camp) but were previously re-read from MongoDB on every
 *    single render — `getAppFeatureFlagsCached` alone was observed at 205ms on `/app/emergency`.
 *    Every global's `afterChange` hook calls `revalidateTag('payload')`, so an edit in the admin
 *    UI still takes effect immediately; `cacheLife` is only the upper bound if that ever fails.
 *
 * 2. A `cache()` wrapper on top for request-level memoisation, so several components asking for
 *    the same global within one render share a single cache-handler lookup.
 *
 * The build-phase guard deliberately sits in the outer layer: during `next build` there is no
 * database, and its placeholder return value must never be written to the persistent cache.
 *
 * Draft (preview) reads bypass the persistent layer entirely — preview must always show what the
 * editor just typed, never an entry that is up to an hour old.
 */

/**
 * Fetches the Footer global, cached across requests.
 *
 * This ensures that multiple components asking for the footer within the same
 * request will share the same database query result.
 */
const readFooter = async (locale: Locale): Promise<Footer> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'footer', 'global:footer');

  return await withSpan('getFooterCached', async () => {
    const payload = await getPayload({ config });
    return await payload.findGlobal({
      slug: 'footer',
      locale,
      select: {
        appNavBarMenu: true,
        minimalFooterMenu: true,
        socialLinks: true,
        sponsors: true,
      },
    });
  });
};

export const getFooterCached = cache(async (locale: Locale): Promise<Footer> => {
  if (isBuildPhase()) {
    return {} as Footer;
  }
  return await readFooter(locale);
});

/**
 * Fetches the Header global, cached across requests.
 */
const queryHeader = async (locale: Locale, draft: boolean): Promise<Header> => {
  const payload = await getPayload({ config });
  return await payload.findGlobal({
    slug: 'header',
    locale,
    draft,
    select: {
      mainMenu: true,
    },
  });
};

const readHeader = async (locale: Locale): Promise<Header> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'header', 'global:header');

  return await withSpan('getHeaderCached', async () => await queryHeader(locale, false));
};

export const getHeaderCached = cache(
  async (locale: Locale, draft: boolean = false): Promise<Header> => {
    if (isBuildPhase()) {
      return {} as Header;
    }
    // Preview reads must reflect unpublished edits immediately, so they skip the persistent cache.
    //
    // Deliberately not wrapped in `withSpan`: this branch runs in an *uncached* scope, and
    // OpenTelemetry's Span constructor calls `Date.now()` unconditionally. In an uncached Server
    // Component that aborts the prerender pass, whereas inside a `'use cache'` body it is a no-op
    // — see the scope table on `withSpan` in `@/utils/tracing-helpers`. The published branch below
    // keeps its span because it runs inside `readHeader`'s cache scope.
    if (draft) {
      return await queryHeader(locale, true);
    }
    return await readHeader(locale);
  },
);

/**
 * Fetches the SEO global, cached across requests.
 */
const readSEO = async (): Promise<SEO> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'seo', 'global:SEO');

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
};

export const getSEOCached = cache(async (): Promise<SEO> => {
  if (isBuildPhase()) {
    return {} as SEO;
  }
  return await readSEO();
});

/**
 * Fetches the Alert Settings global, cached across requests.
 */
const queryAlertSettings = async (
  locale: Locale,
  draft: boolean,
  fallbackLocale: Locale,
): Promise<AlertSetting> => {
  const payload = await getPayload({ config });
  return await payload.findGlobal({
    slug: 'alert_settings',
    locale,
    draft,
    fallbackLocale,
    select: {
      questions: true,
      finalResponseMessage: true,
      emergencyPhoneNumber: true,
    },
  });
};

const readAlertSettings = async (locale: Locale, fallbackLocale: Locale): Promise<AlertSetting> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'alert-settings', 'global:alert_settings');

  return await withSpan(
    'getAlertSettingsCached',
    async () => await queryAlertSettings(locale, false, fallbackLocale),
  );
};

export const getAlertSettingsCached = cache(
  async (
    locale: Locale,
    draft: boolean = false,
    fallbackLocale: Locale = 'de',
  ): Promise<AlertSetting> => {
    if (isBuildPhase()) {
      return {} as AlertSetting;
    }
    // Preview reads must reflect unpublished edits immediately, so they skip the persistent cache.
    if (draft) {
      return await withSpan(
        'getAlertSettingsCached',
        async () => await queryAlertSettings(locale, true, fallbackLocale),
      );
    }
    return await readAlertSettings(locale, fallbackLocale);
  },
);

/**
 * Fetches the App Feature Flags global, cached across requests.
 *
 * Returns the menu-visibility toggles (helper shifts, image upload, reservations).
 */
type AppFeatureFlags = Pick<
  AppFeatureFlag,
  | 'helperShiftsEnabled'
  | 'hideFullHelperShifts'
  | 'imageUploadEnabled'
  | 'photoContestEnabled'
  | 'reservationsEnabled'
  | 'forumEnabled'
  | 'redesignedMainMenuEnabled'
>;

const readAppFeatureFlags = async (): Promise<AppFeatureFlags> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'app-feature-flags', 'global:app-feature-flags');

  return await withSpan('getAppFeatureFlagsCached', async () => {
    const payload = await getPayload({ config });
    return await payload.findGlobal({
      slug: 'app-feature-flags',
      select: {
        helperShiftsEnabled: true,
        hideFullHelperShifts: true,
        imageUploadEnabled: true,
        photoContestEnabled: true,
        reservationsEnabled: true,
        forumEnabled: true,
        redesignedMainMenuEnabled: true,
      },
    });
  });
};

export const getAppFeatureFlagsCached = cache(async (): Promise<AppFeatureFlags> => {
  if (isBuildPhase()) {
    return {
      helperShiftsEnabled: false,
      hideFullHelperShifts: true,
      imageUploadEnabled: false,
      photoContestEnabled: false,
      reservationsEnabled: false,
      forumEnabled: false,
      redesignedMainMenuEnabled: false,
    };
  }
  return await readAppFeatureFlags();
});

/**
 * Fetches the App Landing Page global, cached across requests.
 *
 * Returns the dashboard title, optional welcome content blocks, and the
 * showActionCards toggle.
 */
type AppLandingPageContent = Pick<AppLandingPage, 'title' | 'pageContent' | 'showActionCards'>;

const readAppLandingPage = async (locale: Locale): Promise<AppLandingPageContent> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'app-landing-page', 'global:app-landing-page');

  return await withSpan('getAppLandingPageCached', async () => {
    const payload = await getPayload({ config });
    return await payload.findGlobal({
      slug: 'app-landing-page',
      locale,
      select: {
        title: true,
        pageContent: true,
        showActionCards: true,
      },
    });
  });
};

export const getAppLandingPageCached = cache(
  async (locale: Locale): Promise<AppLandingPageContent> => {
    if (isBuildPhase()) {
      return { title: '', showActionCards: false };
    }
    return await readAppLandingPage(locale);
  },
);
