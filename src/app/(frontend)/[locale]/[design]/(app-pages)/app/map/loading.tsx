import type React from 'react';

/**
 * While the Karte loads: an empty map with its search row and locate button where they will be,
 * so the controls do not jump in once the map draws.
 */
export default function MapLoading(): React.ReactNode {
  return (
    <div className="bg-quiet fixed top-[calc(var(--app-content-top)-var(--app-logo-overhang,0px))] left-0 z-30 h-[calc(100dvh-var(--app-content-top)+var(--app-logo-overhang,0px))] w-full animate-pulse xl:left-(--app-content-left) xl:w-[calc(100dvw-var(--app-content-left))]">
      <div className="absolute top-[calc(0.75rem+var(--app-logo-overhang,0px))] right-4 left-4 flex items-center gap-2">
        <div className="border-line h-[44px] flex-1 rounded-[12px] border bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]" />
        <div className="h-11 w-11 shrink-0 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)]" />
      </div>
    </div>
  );
}
