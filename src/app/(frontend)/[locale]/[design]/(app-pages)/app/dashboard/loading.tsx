import { DashboardAppFeaturesSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-app-features-skeleton';
import type React from 'react';

/**
 * Skeleton loading component for the Dashboard page: today's programme and the
 * feature list, in the shapes the page renders them.
 */
export default function DashboardLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-[62px] left-0 z-30 h-[calc(100dvh-62px)] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5 sm:px-6 md:px-8">
        <div className="space-y-2">
          <div className="bg-chip h-3 w-32 animate-pulse rounded" />
          <div className="border-line h-40 rounded-[14px] border bg-white" />
        </div>
        <DashboardAppFeaturesSkeleton />
      </div>
    </div>
  );
}
