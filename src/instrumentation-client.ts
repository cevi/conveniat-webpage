import { loadPostHog } from '@/lib/posthog-client';

// Start PostHog before hydration, so errors thrown while the page boots are still reported.
// What it may collect follows the analytics consent, see `loadPostHog`.
void loadPostHog();
