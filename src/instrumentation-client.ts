import { loadPostHog } from '@/lib/posthog-client';

// Start PostHog before hydration for people who already consented to analytics, so errors
// thrown while the page boots are still reported. Without consent this does nothing.
void loadPostHog();
