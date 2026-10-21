'use client';

import { DashboardQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-quick-access';
import { DashboardQuickAccessSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-quick-access-skeleton';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * Title and Schnellzugriff of the dashboard. The CMS title is the app header's title; the CMS
 * switch "Aktionskarten anzeigen" decides whether the Schnellzugriff is shown, and its feature
 * flags which tiles it has.
 *
 * The data is fetched client side through the persisted react-query cache:
 * when navigating back to the dashboard the previously loaded content is
 * rendered immediately (also while offline) and silently replaced once the
 * background revalidation finishes.
 *
 * `children` holds the greeting, the server rendered welcome content blocks and "Jetzt",
 * which are displayed above the Schnellzugriff.
 */
export const DashboardLandingSection: React.FC<{
  locale: Locale;
  materialEnabled: boolean;
  supportEmail: string;
  children?: React.ReactNode;
}> = ({ locale, materialEnabled, supportEmail, children }) => {
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
        <DashboardQuickAccessSkeleton />
      </>
    );
  }

  return (
    <>
      <SetDynamicPageTitle newTitle={dashboardConfig.title} />
      {children}
      {dashboardConfig.showActionCards && (
        <DashboardQuickAccess
          locale={locale}
          supportEmail={supportEmail}
          flags={{
            // guarded: a phone may restore a configuration cached before the flags existed
            imageUploadEnabled:
              (dashboardConfig.featureFlags as { imageUploadEnabled?: boolean } | undefined)
                ?.imageUploadEnabled !== false,
            materialEnabled,
          }}
        />
      )}
    </>
  );
};
