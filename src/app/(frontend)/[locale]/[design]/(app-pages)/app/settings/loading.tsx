import { SettingsSkeleton } from '@/features/settings/components/settings-skeleton';
import type React from 'react';

/** The settings while they load, in the layout they load into. */
export default function SettingsLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-(--app-content-left) xl:w-[calc(100dvw-var(--app-content-left))]">
      <SettingsSkeleton />
    </div>
  );
}
