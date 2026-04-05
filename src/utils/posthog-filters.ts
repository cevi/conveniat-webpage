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
  }
  // eslint-disable-next-line unicorn/no-null
  return event ?? null;
};
