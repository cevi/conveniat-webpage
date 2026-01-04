import { environmentVariables } from '@/config/environment-variables';
import posthog from 'posthog-js';

// Initialize PostHog early in the client lifecycle
if (typeof globalThis !== 'undefined' && environmentVariables.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    capture_pageview: false, // We capture pageviews manually
    capture_pageleave: true, // Enable pageleave capture
    disable_session_recording: false, // Ensure session recording is enabled
  });
}
