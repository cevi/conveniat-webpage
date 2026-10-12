import { environmentVariables } from '@/config/environment-variables';
import { getAnalyticsConsent } from '@/utils/analytics-consent';
import { filterPostHogNoise } from '@/utils/posthog-filters';
import { registerPostHogSuperProperties } from '@/utils/posthog-super-properties';
import type { CaptureResult, PostHog } from 'posthog-js';

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

/**
 * What PostHog still receives from somebody who did not consent: counted page views and errors,
 * sent in cookieless mode. Everything else waits for consent.
 */
const ANONYMOUS_EVENTS = new Set(['$pageview', '$pageleave', '$exception']);

const filterByConsent = (event: CaptureResult | null): CaptureResult | null => {
  if (event !== null && getAnalyticsConsent() !== 'granted' && !ANONYMOUS_EVENTS.has(event.event)) {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }
  return filterPostHogNoise(event);
};

const initPostHog = async (): Promise<PostHog> => {
  const { default: posthog } = await import('posthog-js');
  posthog.init(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false, // page views are captured manually
    capture_pageleave: true,
    // Without consent posthog-js runs cookieless: it stores nothing on the device, keeps no
    // visitor id and records no sessions. Not having answered counts as not consenting.
    cookieless_mode: 'on_reject',
    opt_out_capturing_by_default: true,
    // drops what needs consent, then known noise like CefSharp bot errors (e.g., from Outlook
    // Safe Links), see: https://github.com/cevi/conveniat-webpage/issues/1013
    before_send: filterByConsent,
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
 * The PostHog client, switched to what the person currently consents to.
 *
 * This is the only place posthog-js is initialised. With consent it runs in full: a visitor id
 * in a cookie, autocapture and session recordings. Without consent, or before anybody answered,
 * it only counts page views and errors in cookieless mode. Call it again whenever the answer
 * changes.
 */
export const loadPostHog = async (): Promise<PostHog | undefined> => {
  if (!isBrowser || !isPostHogConfigured() || isLivePreviewFrame()) return undefined;

  initializedClient ??= initPostHog();
  let posthog: PostHog;
  try {
    posthog = await initializedClient;
  } catch (error: unknown) {
    // Offline the posthog-js chunk cannot be fetched. Forget the failure, so the next call
    // starts over instead of awaiting it forever.
    initializedClient = undefined;
    console.debug('[PostHog] Could not be started:', error);
    return undefined;
  }

  const isGranted = getAnalyticsConsent() === 'granted';
  if (isGranted && posthog.has_opted_out_capturing()) {
    posthog.opt_in_capturing({ captureEventName: false });
  } else if (!isGranted && posthog.has_opted_in_capturing()) {
    // Back to cookieless mode, which also removes the PostHog cookie and local storage entry.
    posthog.opt_out_capturing();
  }
  return posthog;
};
