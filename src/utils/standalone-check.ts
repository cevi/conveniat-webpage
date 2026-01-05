/**
 *
 * Checks if the app is running in standalone mode (PWA).
 * Checks both standard `display-mode: standalone` and iOS specific `navigator.standalone`.
 *
 */
export const isPWAStandalone = (): boolean => {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  return (
    globalThis.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari specific check
    ('standalone' in navigator && (navigator as Navigator & { standalone: boolean }).standalone)
  );
};
