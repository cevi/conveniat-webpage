import { environmentVariables } from '@/config/environment-variables';
import type { PostHog } from 'posthog-js';

export const initPostHog = (posthog: PostHog): void => {
  if (environmentVariables.NEXT_PUBLIC_POSTHOG_KEY === undefined) {
    console.warn('PostHog key is not set. PostHog will not be initialized.');
    return;
  }

  posthog.init(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    capture_pageview: false, // We capture pageviews manually
    capture_pageleave: true, // Enable pageleave capture
  });
};
