'use client';

import { DashboardAppFeatures } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features';
import {
  DashboardAppFeaturesSkeleton,
  DashboardTitleSkeleton,
} from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features-skeleton';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * Title and action cards of the dashboard.
 *
 * The data is fetched client side through the persisted react-query cache:
 * when navigating back to the dashboard the previously loaded content is
 * rendered immediately (also while offline) and silently replaced once the
 * background revalidation finishes. This avoids the loading skeleton that a
 * server rendered (and therefore uncached) section would show on every
 * navigation.
 *
 * `children` holds the server rendered welcome content blocks which are
 * displayed between the title and the action cards.
 */
export const DashboardLandingSection: React.FC<{
  locale: Locale;
  children?: React.ReactNode;
}> = ({ locale, children }) => {
  const { data: dashboardConfig } = trpc.appContent.getDashboardConfig.useQuery(undefined, {
    // keep the cached content for a minute before revalidating in the background
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });

  if (dashboardConfig === undefined) {
    return (
      <>
        <DashboardTitleSkeleton />
        {children}
        <DashboardAppFeaturesSkeleton />
      </>
    );
  }

  return (
    <>
      <SetDynamicPageTitle newTitle={dashboardConfig.title} />
      <HeadlineH1 className="mb-4">{dashboardConfig.title}</HeadlineH1>
      {children}
      {dashboardConfig.showActionCards && (
        <DashboardAppFeatures locale={locale} featureFlags={dashboardConfig.featureFlags} />
      )}
    </>
  );
};
