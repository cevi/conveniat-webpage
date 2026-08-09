import {
  getAppFeatureFlagsCached,
  getAppLandingPageCached,
} from '@/features/payload-cms/api/cached-globals';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';

/**
 * Router exposing the CMS-managed app content that the client renders directly.
 *
 * These queries are consumed by client components backed by the persisted
 * react-query cache. That way the dashboard can render its last known content
 * instantly on navigation and revalidate in the background instead of showing
 * a loading skeleton on every visit.
 */
export const appContentRouter = createTRPCRouter({
  /**
   * Configuration of the app dashboard: the landing page title, whether the
   * action cards are shown and the feature flags deciding which cards exist.
   *
   * The welcome content blocks are intentionally not part of this payload:
   * they are rendered on the server since content blocks may require server
   * only data access.
   */
  getDashboardConfig: publicProcedure.query(async ({ ctx }) => {
    const { locale } = ctx;

    const [landingPage, featureFlags] = await Promise.all([
      getAppLandingPageCached(locale),
      getAppFeatureFlagsCached(),
    ]);

    return {
      title: landingPage.title,
      showActionCards: landingPage.showActionCards ?? false,
      // a flag that has never been set explicitly counts as enabled
      featureFlags: {
        helperShiftsEnabled: featureFlags.helperShiftsEnabled !== false,
        imageUploadEnabled: featureFlags.imageUploadEnabled !== false,
        photoContestEnabled: featureFlags.photoContestEnabled !== false,
        reservationsEnabled: featureFlags.reservationsEnabled !== false,
        forumEnabled: featureFlags.forumEnabled !== false,
      },
    };
  }),
});
