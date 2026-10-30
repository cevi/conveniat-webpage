import {
  ScheduleLoadingSkeleton,
  SearchFilterHeaderPlaceholder,
} from '@/features/schedule/components/schedule-loading-skeleton';
import type React from 'react';

/** While the Schichteinsätze load: the Programm's skeleton, with shifts only and no view. */
export default function HelperPortalLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-(--app-content-left) xl:w-[calc(100dvw-var(--app-content-left))]">
      <SearchFilterHeaderPlaceholder />
      <ScheduleLoadingSkeleton showScope={false} rows={[true, true, true]} />
    </div>
  );
}
