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

/**
 *
 * Returns the entrypoint URL based on the current app mode.
 * If in standalone mode, returns '/entrypoint?app-mode=true'.
 * Otherwise, returns '/entrypoint'.
 *
 * The `app-mode=true` query parameter is necessary that the app
 * mode is preserved during redirects or reloads of the entrypoint.
 *
 */
export const getAppModeEntrypointUrl = (): string => {
  return isPWAStandalone() ? '/entrypoint?app-mode=true' : '/entrypoint';
};
