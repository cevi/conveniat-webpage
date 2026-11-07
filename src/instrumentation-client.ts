import { installBlockedStorageFallback } from '@/lib/blocked-storage-fallback';
import { loadPostHog } from '@/lib/posthog-client';

// Synchronous and first, so it is in place before any component module reads localStorage.
installBlockedStorageFallback(globalThis.window);

// Start PostHog before hydration, so errors thrown while the page boots are still reported.
// What it may collect follows the analytics consent, see `loadPostHog`.
void loadPostHog();
