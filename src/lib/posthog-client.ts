import { environmentVariables } from '@/config/environment-variables';
import { getAnalyticsConsent } from '@/utils/analytics-consent';
import { filterPostHogNoise } from '@/utils/posthog-filters';
import { registerPostHogSuperProperties } from '@/utils/posthog-super-properties';
import type { PostHog } from 'posthog-js';

// detect globalThis for SSR safety
const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;

let initializedClient: Promise<PostHog> | undefined;

/**
 * True when this deployment was built with a PostHog project key. Without one there is no
 * analytics to consent to.
 */
export const isPostHogConfigured = (): boolean =>
  environmentVariables.NEXT_PUBLIC_POSTHOG_KEY !== undefined &&
  environmentVariables.NEXT_PUBLIC_POSTHOG_KEY !== '';

// Disable PostHog inside the Live Preview iframe. Rapid 'Ctrl+S' saves trigger heavy
// Next.js RSC fetches and iframe reloads. If PostHog fires events during this, the
// '/ingest' proxy connections stall and exhaust the browser's 6-connection pool limit,
// breaking the iframe entirely. The parent Admin panel (`/admin`) is still tracked.
const isLivePreviewFrame = (): boolean =>
  globalThis.self !== globalThis.top &&
  (globalThis.location.search.includes('preview=true') ||
    globalThis.location.pathname.includes('/preview-fallback'));

const initPostHog = async (): Promise<PostHog> => {
  const { default: posthog } = await import('posthog-js');
  posthog.init(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // page views are captured manually
    capture_pageleave: true,
    // Withdrawing consent also removes the PostHog cookie and local storage entry.
    opt_out_persistence_by_default: true,
    // filter out known noise like CefSharp bot errors (e.g., from Outlook Safe Links)
    // see: https://github.com/cevi/conveniat-webpage/issues/1013
    before_send: filterPostHogNoise,
    // Silently handle PostHog network errors so they never bubble up
    on_request_error: (error: unknown) => {
      console.debug('[PostHog] Request failed silently:', error);
    },
  });

  // After init, so the properties are attached to the live instance. This is a
  // module-level singleton with no teardown, so the disposer is intentionally
  // dropped - the bridge poll is bounded and stops on its own.
  registerPostHogSuperProperties(posthog);
  return posthog;
};

/**
 * The PostHog client, or `undefined` while nobody consented to analytics.
 *
 * This is the only place posthog-js is initialised. Until consent is granted the library is not
 * even downloaded, so nothing is stored on the device and nothing is sent to `/ingest`. Every
 * other caller reaches PostHog through `import('posthog-js')`, whose `capture` and
 * `captureException` do nothing on an instance that was never initialised.
 */
export const loadPostHog = async (): Promise<PostHog | undefined> => {
  if (!isBrowser || !isPostHogConfigured() || isLivePreviewFrame()) return undefined;
  if (getAnalyticsConsent() !== 'granted') return undefined;

  initializedClient ??= initPostHog();
  const posthog = await initializedClient;

  // Consent may have been withdrawn while the library was loading.
  if (getAnalyticsConsent() !== 'granted') return undefined;

  // An earlier withdrawal leaves posthog-js opted out, also across page loads.
  if (posthog.has_opted_out_capturing()) {
    posthog.opt_in_capturing({ captureEventName: false });
  }
  return posthog;
};

/**
 * Stops capturing after consent was withdrawn and removes what PostHog stored on the device.
 * Does nothing when PostHog was never started.
 */
export const stopPostHog = async (): Promise<void> => {
  if (initializedClient === undefined) return;
  const posthog = await initializedClient;
  if (getAnalyticsConsent() === 'granted') return;
  posthog.opt_out_capturing();
  posthog.stopSessionRecording();
};
