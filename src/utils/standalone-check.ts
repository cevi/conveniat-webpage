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
 * User-agent markers the native shells append, one per deployment. Both are listed
 * because one build of this site serves both brands and the WebView never tells us
 * which one it is any other way.
 */
const NATIVE_APP_USER_AGENT_MARKERS = ['KonektaApp', 'Conveniat27App'] as const;

/**
 * Checks whether a user-agent string comes from a native app WebView. Shared by the
 * browser helper below, the edge proxy and the service worker, which all read the
 * user agent from different places.
 */
export const isNativeAppUserAgent = (userAgent: string): boolean =>
  NATIVE_APP_USER_AGENT_MARKERS.some((marker) => userAgent.includes(marker));

/**
 * Checks if the app is running inside a native app WebView (the React Native wrapper).
 * The native app injects its brand marker into the user-agent string.
 */
export const isNativeAppWebView = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return isNativeAppUserAgent(navigator.userAgent);
};
