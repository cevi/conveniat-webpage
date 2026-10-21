'use client';

import { DashboardAppFeatures } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features';
import { DashboardAppFeaturesSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features-skeleton';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * Title and feature list of the dashboard. The CMS title is the app header's title; it is not
 * repeated as a heading on the page.
 *
 * The data is fetched client side through the persisted react-query cache:
 * when navigating back to the dashboard the previously loaded content is
 * rendered immediately (also while offline) and silently replaced once the
 * background revalidation finishes. This avoids the loading skeleton that a
 * server rendered (and therefore uncached) section would show on every
 * navigation.
 *
 * `children` holds the server rendered welcome content blocks and today's programme, which are
 * displayed above the feature list.
 */
export const DashboardLandingSection: React.FC<{
  locale: Locale;
  children?: React.ReactNode;
}> = ({ locale, children }) => {
  const { data: dashboardConfig } = trpc.appContent.getDashboardConfig.useQuery(
    { locale },
    {
      // keep the cached content for a minute before revalidating in the background
      staleTime: 60 * 1000,
      refetchOnMount: true,
      // a failed background revalidation must not throw away the cached content,
      // but without any content there is nothing to show but the error
      throwOnError: (_error, query) => query.state.data === undefined,
    },
  );

  if (dashboardConfig === undefined) {
    return (
      <>
        {children}
        <DashboardAppFeaturesSkeleton />
      </>
    );
  }

  return (
    <>
      <SetDynamicPageTitle newTitle={dashboardConfig.title} />
      {children}
      {dashboardConfig.showActionCards && (
        <DashboardAppFeatures locale={locale} featureFlags={dashboardConfig.featureFlags} />
      )}
    </>
  );
};
