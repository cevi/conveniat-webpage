import { initPostHog } from '@/lib/posthog-client';

// Initialize PostHog early in the client lifecycle (skip for bots)
// This is used by Next.js as an instrumentation hook if configured,
// or as a side-effect import in some layouts.
initPostHog();
