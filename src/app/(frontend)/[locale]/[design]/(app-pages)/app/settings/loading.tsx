import { SettingsSkeleton } from '@/features/settings/components/settings-skeleton';
import type React from 'react';

/** The settings while they load, in the layout they load into. */
export default function SettingsLoading(): React.ReactNode {
  return (
    <div className="bg-page fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full overflow-y-auto xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <SettingsSkeleton />
    </div>
  );
}
