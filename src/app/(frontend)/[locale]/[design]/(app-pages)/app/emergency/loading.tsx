import { EmergencyCardsSkeleton } from '@/features/emergency/components/emergency-cards-skeleton';
import type React from 'react';

/**
 * Skeleton loading component for the Emergency page: the emergency cards and the alarm slider.
 */
export default function EmergencyLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-6">
        <EmergencyCardsSkeleton />
      </div>
      {/* where the Alarmieren slider will be, so it does not pop in */}
      <div className="fixed bottom-20 left-0 w-full p-4 xl:left-[480px] xl:w-[calc(100%-480px)]">
        <div className="bg-danger-soft mx-auto h-16 max-w-md animate-pulse rounded-full" />
      </div>
    </div>
  );
}
