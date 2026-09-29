'use client';

import { renewPushSubscriptionOnStaleKey } from '@/utils/push-notifications/push-subscription';
import { useEffect } from 'react';

/**
 * Checks once per page load whether this browser's push subscription still uses the current
 * VAPID key, and moves it over if not.
 */
export const usePushSubscriptionKeyRenewal = (): void => {
  useEffect(() => {
    renewPushSubscriptionOnStaleKey().catch((error: unknown) => {
      console.warn('Failed to move the push subscription to the current VAPID key', error);
    });
  }, []);
};
