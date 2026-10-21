import type React from 'react';

/**
 * While the Karte loads: an empty map with its search row and locate button where they will be,
 * so the controls do not jump in once the map draws.
 */
export default function MapLoading(): React.ReactNode {
  return (
    <div className="bg-quiet fixed top-(--app-content-top) left-0 z-30 h-[calc(100dvh-var(--app-content-top))] w-full animate-pulse xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <div className="absolute top-3 right-4 left-4 flex items-center gap-2">
        <div className="h-11 flex-1 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]" />
        <div className="h-11 w-11 shrink-0 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]" />
      </div>
    </div>
  );
}
