'use client';

import { DashboardQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-quick-access';
import { QuickAccessSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-skeleton';
import type { QuickAccessFlags } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * The flags of the cached dashboard configuration. Guarded: a phone may restore a configuration
 * cached before a flag existed, and a flag never set counts as enabled, as on the server.
 */
const quickAccessFlagsOf = (featureFlags: unknown, materialEnabled: boolean): QuickAccessFlags => {
  const flags = (featureFlags ?? {}) as Partial<Record<keyof QuickAccessFlags, boolean>>;
  return {
    imageUploadEnabled: flags.imageUploadEnabled !== false,
    helperShiftsEnabled: flags.helperShiftsEnabled !== false,
    photoContestEnabled: flags.photoContestEnabled !== false,
    materialEnabled,
  };
};

/**
 * Schnellzugriff of the dashboard. The CMS switch "Aktionskarten anzeigen" decides whether it is
 * shown, and its feature flags which tiles it has.
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
        <QuickAccessSkeleton />
      </>
    );
  }

  return (
    <DashboardLanding
      locale={locale}
      showActionCards={dashboardConfig.showActionCards}
      flags={quickAccessFlagsOf(dashboardConfig.featureFlags, materialEnabled)}
      supportEmail={supportEmail}
    >
      {children}
    </DashboardLanding>
  );
};

/**
 * Home as the CMS configures it: `children` and, if switched on, the Schnellzugriff. The live
 * preview of the landing page renders it with the draft. The CMS title names Home in the app
 * header, which reads it itself, see `PageTitle`.
 */
export const DashboardLanding: React.FC<{
  locale: Locale;
  showActionCards: boolean;
  flags: QuickAccessFlags;
  supportEmail: string;
  children?: React.ReactNode;
}> = ({ locale, showActionCards, flags, supportEmail, children }) => (
  <>
    {children}
    {showActionCards && (
      <DashboardQuickAccess locale={locale} supportEmail={supportEmail} flags={flags} />
    )}
  </>
);
