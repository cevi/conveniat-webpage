import { environmentVariables } from '@/config/environment-variables';
import type { PostHog } from 'posthog-js';
import posthog from 'posthog-js/dist/module.full';

// detect globalThis for SSR safety
const isBrowser = typeof globalThis !== 'undefined' && 'window' in globalThis;

let isInitialized = false;

/**
 * Initializes PostHog with the correct configuration.
 * Using module.full to ensure all extensions (session recording, etc.) are pre-bundled.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const initPostHog = (instance: any = posthog): PostHog | undefined => {
  if (!isBrowser) {
    return;
  }

  if (
    environmentVariables.NEXT_PUBLIC_POSTHOG_KEY === undefined ||
    environmentVariables.NEXT_PUBLIC_POSTHOG_KEY === ''
  ) {
    return;
  }

  if (!isInitialized) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    instance.init(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      capture_pageview: false, // We capture pageviews manually
      capture_pageleave: true, // Enable pageleave capture
      disable_session_recording: false, // Ensure session recording is enabled
    });
    isInitialized = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return instance;
};
