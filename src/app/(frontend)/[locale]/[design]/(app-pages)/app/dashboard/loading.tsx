import { DashboardSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-skeleton';
import type React from 'react';

/** Home while it loads, in the layout it loads into. */
export default function DashboardLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-(--app-content-left) xl:w-[calc(100dvw-var(--app-content-left))]">
      <DashboardSkeleton />
    </div>
  );
}
