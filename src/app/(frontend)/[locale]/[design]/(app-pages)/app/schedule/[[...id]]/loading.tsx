import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
import type React from 'react';

/** While the Programm route loads: the same skeleton the list shows while its data loads. */
export default function ScheduleLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <ScheduleLoadingSkeleton />
    </div>
  );
}
