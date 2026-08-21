'use client';

import type React from 'react';
import { useEffect } from 'react';

/**
 * Signals the {@link ./boot-watchdog#BootWatchdog} that the client bundle ran and React hydrated.
 *
 * Rendered inside the onboarding layout's hydrated tree, so its effect firing is proof that the
 * app booted. It sets the global flag the watchdog checks, clears the one-reload budget (a clean
 * boot re-arms auto-recovery for any later stall in the same session), and hides the fallback in
 * case the watchdog revealed it just as hydration completed. Renders nothing.
 */
export const BootHydrationMarker: React.FC = () => {
  useEffect(() => {
    (globalThis as typeof globalThis & { __konektaHydrated?: boolean }).__konektaHydrated = true;

    try {
      sessionStorage.removeItem('konekta_boot_reload_attempted');
    } catch {
      // sessionStorage may be unavailable (private mode); the flag is best-effort.
    }

    const fallback = document.querySelector<HTMLElement>('#konekta-boot-fallback');
    if (fallback) fallback.style.display = 'none';
  }, []);

  return <></>;
};
