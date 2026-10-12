import type { AnalyticsConsent } from '@/utils/analytics-consent';
import { getAnalyticsConsent, subscribeToAnalyticsConsent } from '@/utils/analytics-consent';
import { useSyncExternalStore } from 'react';

const getServerSnapshot = (): undefined => undefined;

/**
 * The stored analytics consent, kept in sync when it changes in this tab. It is `undefined` on
 * the server and during hydration, where the cookie cannot be read yet.
 */
export const useAnalyticsConsent = (): AnalyticsConsent | undefined =>
  useSyncExternalStore(subscribeToAnalyticsConsent, getAnalyticsConsent, getServerSnapshot);
