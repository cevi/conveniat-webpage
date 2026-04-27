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
    isNativeAppWebView() ||
    globalThis.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari specific check
    ('standalone' in navigator && (navigator as Navigator & { standalone: boolean }).standalone)
  );
};

/**
 * Checks if the app is running inside a native app WebView (e.g. Konekta React Native wrapper).
 * The native app injects 'KonektaApp' into the user-agent string.
 */
export const isNativeAppWebView = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return navigator.userAgent.includes('KonektaApp');
};
