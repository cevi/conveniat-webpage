import type { CaptureResult } from 'posthog-js';

/**
 * Filter out known noise like CefSharp bot errors (e.g., from Outlook Safe Links)
 */
const noiseMessages = [
  // see: https://github.com/cevi/conveniat-webpage/issues/1012
  'Object Not Found Matching Id',

  // see: https://github.com/cevi/conveniat-webpage/issues/927
  // This happens when a browser extension (like an adblocker or a password manager)
  // tries to communicate with a tab that the user just closed or that recently refreshed.
  'Invalid call to runtime.sendMessage(). Tab not found.',

  // see: https://github.com/cevi/conveniat-webpage/issues/927
  // This is a known signature of the Bitwarden password manager extension failing to communicate internally.
  'Unhandled error response received for message <get-frame-manager-configuration>',

  // see: https://github.com/cevi/conveniat-webpage/issues/927
  // Often caused by browser extensions that modify the DOM (like Grammarly or certain adblockers / privacy tools).
  'Unhandled error response received for message <shell-plugins-site-config>',

  // PostHog's autocapture/session recording enumerates window.frames and tries to access each
  // frame's `document`. The EmailPreviewField uses sandbox="" which makes its iframe cross-origin,
  // causing the browser to throw a SecurityError. This is expected and harmless.
  'Blocked a frame with origin',

  // rrweb/posthog-js internal error when terminating session recording involving cross-origin iframes on Safari.
  // This causes an 'undefined is not an object (evaluating 'r.bufferBelongsToIframe')' error.
  'bufferBelongsToIframe',

  // Safari quirk/extension injecting code that tries to detect Firefox reader mode.
  // This causes an 'undefined is not an object (evaluating 'window.__firefox__.reader')' error.
  // see: https://github.com/cevi/conveniat-webpage/issues/1150
  'window.__firefox__.reader',

  // see: https://github.com/cevi/conveniat-webpage/issues/1169
  // Common Android WebView error triggered by injected scripts (like Facebook in-app browser)
  // attempting to use a JS bridge that has already been destroyed during navigation or backgrounding.
  'Error invoking postMessage: Java object is gone',

  // see: https://github.com/cevi/conveniat-webpage/issues/1168
  // Another variant of the Android WebView JS bridge error.
  'Error invoking enableDidUserTypeOnKeyboardLogging: Java object is gone',

  // see: https://github.com/cevi/conveniat-webpage/issues/1148
  // DOMException in Mobile Safari usually related to Private Browsing, ITP,
  // or network flakiness when trying to load/register the service worker.
  'SecurityError: Script https://conveniat27.ch/sw.js load failed',
];

export const filterPostHogNoise = (event: CaptureResult | null): CaptureResult | null => {
  if (event?.event === '$exception') {
    const props = event.properties;
    const exceptionMessage = props['$exception_message'] as unknown;
    if (
      typeof exceptionMessage === 'string' &&
      noiseMessages.some((message) => exceptionMessage.includes(message))
    ) {
      // eslint-disable-next-line unicorn/no-null
      return null; // drop the event
    }

    const exceptionList = props['$exception_list'] as unknown;
    if (Array.isArray(exceptionList)) {
      for (const exc of exceptionList as Array<
        { type?: unknown; value?: unknown } | null | undefined
      >) {
        const type = exc?.type;
        const value = exc?.value;
        if (
          (typeof type === 'string' && noiseMessages.some((m) => type.includes(m))) ||
          (typeof value === 'string' && noiseMessages.some((m) => value.includes(m)))
        ) {
          // eslint-disable-next-line unicorn/no-null
          return null; // drop the event
        }
      }
    }
  }
  // eslint-disable-next-line unicorn/no-null
  return event ?? null;
};
