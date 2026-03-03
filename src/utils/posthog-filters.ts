import type { CaptureResult } from 'posthog-js';

/**
 * Filter out known noise like CefSharp bot errors (e.g., from Outlook Safe Links)
 * see: https://github.com/cevi/conveniat-webpage/issues/1012
 */
export const filterPostHogNoise = (event: CaptureResult | null): CaptureResult | null => {
  if (event?.event === '$exception') {
    const props = event.properties;
    const exceptionMessage = props['$exception_message'] as unknown;
    if (
      typeof exceptionMessage === 'string' &&
      exceptionMessage.includes('Object Not Found Matching Id')
    ) {
      // eslint-disable-next-line unicorn/no-null
      return null; // drop the event
    }
  }
  // eslint-disable-next-line unicorn/no-null
  return event ?? null;
};
