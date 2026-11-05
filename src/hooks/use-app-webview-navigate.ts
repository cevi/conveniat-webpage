'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  /**
   * Set while an app page is loaded. The native app (app-core) calls it for a link that
   * arrives, like a tapped band, and loads the URL itself only if this is missing, throws or
   * answers anything but `true`.
   */
  var AppWebViewNavigate: ((url: string) => boolean) | undefined;
}

/**
 * Navigates the router to a link the native app hands over, so the page stays loaded and a
 * route that opens as a sheet, like a tapped band, opens over it. Only URLs of this origin; the
 * native side has already given the link the host of this environment. Anything else answers
 * `false`, and the app loads it itself.
 */
export const navigateWithinApp = (url: unknown, push: (path: string) => void): boolean => {
  if (typeof url !== 'string') return false;
  let target: URL;
  try {
    target = new URL(url, globalThis.location.href);
  } catch {
    return false;
  }
  if (target.origin !== globalThis.location.origin) return false;
  push(`${target.pathname}${target.search}${target.hash}`);
  return true;
};

/** Offers `window.AppWebViewNavigate` to the native app while the component is mounted. */
export const useAppWebViewNavigate = (): void => {
  const router = useRouter();
  useEffect(() => {
    const navigate = (url: string): boolean => navigateWithinApp(url, (path) => router.push(path));
    globalThis.AppWebViewNavigate = navigate;
    return (): void => {
      if (globalThis.AppWebViewNavigate === navigate) globalThis.AppWebViewNavigate = undefined;
    };
  }, [router]);
};
