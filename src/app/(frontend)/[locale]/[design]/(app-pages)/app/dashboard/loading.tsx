import { DashboardQuickAccessSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-quick-access-skeleton';
import type React from 'react';

/**
 * Skeleton loading component for the Dashboard page: the greeting, "Jetzt" and the
 * Schnellzugriff, in the shapes the page renders them.
 */
export default function DashboardLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5 sm:px-6 md:px-8">
        <div className="h-[64px]">
          <div className="bg-chip h-8 w-40 animate-pulse rounded" />
          <div className="bg-quiet mt-2 h-4 w-48 animate-pulse rounded" />
        </div>
        <div className="space-y-2">
          <div className="bg-chip h-3 w-16 animate-pulse rounded" />
          <div className="border-line h-[104px] rounded-[14px] border bg-white" />
        </div>
        <DashboardQuickAccessSkeleton />
      </div>
    </div>
  );
}
