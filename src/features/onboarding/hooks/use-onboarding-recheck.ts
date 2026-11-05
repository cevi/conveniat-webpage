'use client';

import { isNativePushActive } from '@/features/onboarding/hooks/use-native-push-subscription-status';
import { SESSION_EXPIRED_ENTRYPOINT } from '@/features/onboarding/onboarding-constants';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { forgetOnboardingComplete, ONBOARDING_COMPLETE_KEY } from '@/lib/onboarding-complete';
import { readPreference, writePreference } from '@/lib/preferences';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { Cookie } from '@/types/types';
import { replaceLocation } from '@/utils/assign-location';
import { isCookieTrue } from '@/utils/cookie-utils';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import {
  restoreLostPushSubscription,
  unsubscribeFromPushNotifications,
} from '@/utils/push-notifications/push-subscription';
import { ANSWERED_BY_SERVICE_WORKER_HEADER } from '@/utils/service-worker-messages';
import { isNativeAppWebView } from '@/utils/standalone-check';
import { useEffect, useRef } from 'react';

/** How often a web app tells the server that its push subscription is still in use. */
const PUSH_CHECK_IN_INTERVAL_MS = 24 * 60 * 60 * 1000;

const isOnboardingComplete = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Asks the server whether the session is still valid. `undefined` while it cannot tell: no
 * answer, an error, or an answer the service worker made up from its cache.
 */
const fetchSessionVerdict = async (): Promise<'valid' | 'expired' | undefined> => {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!response.ok || response.headers.has(ANSWERED_BY_SERVICE_WORKER_HEADER)) return undefined;
    const session = (await response.json()) as { user?: unknown } | null;
    return session?.user === undefined || session.user === null ? 'expired' : 'valid';
  } catch {
    return undefined;
  }
};

/**
 * The onboarding's start-up checks, run in the background of the app.
 *
 * A start whose onboarding is done skips the entrypoint (see `EntrypointFastPath`), so the
 * checks it ran on every start run here instead, without holding up the app:
 *
 * - **Session.** A logged-in user whose session has expired goes back to the entrypoint, which
 *   shows the login. Only the server's own answer counts: on wifi without an uplink the service
 *   worker answers from its cache, and the check waits until the network answers again, so a
 *   bad connection never logs anybody out.
 * - **Push.** Push permission withdrawn in the system settings, or a lost token, makes the next
 *   start show the push step again, as it did before; the current visit is not interrupted.
 *   An installed web app that still has the permission but lost its subscription is
 *   subscribed again right away, unless the user turned push off (`web-push-opted-out`): the
 *   push step would not show, since the permission is there. One that still has its
 *   subscription checks in once a day instead, so the admin panel can tell a device in use
 *   from one that is gone.
 */
export const useOnboardingRecheck = (locale: Locale): void => {
  const isOnline = useOnlineStatus();
  const hasCheckedSession = useRef(false);
  const hasCheckedPushSubscription = useRef(false);
  const { mutateAsync: confirmPushSubscription } =
    trpc.pushTracking.confirmWebPushSubscription.useMutation();

  useEffect(() => {
    if (!isOnline || hasCheckedSession.current || !isOnboardingComplete()) return;
    if (isCookieTrue(Cookie.HAS_SKIPPED_AUTH)) return;

    let isCancelled = false;
    void fetchSessionVerdict().then((verdict) => {
      if (isCancelled || verdict === undefined) return;
      hasCheckedSession.current = true;
      if (verdict === 'valid') return;
      // the same way out as a 401 from tRPC; it also forgets that the onboarding is done
      flushPersonalData({ keepUnsentChatMessages: true });
      replaceLocation(SESSION_EXPIRED_ENTRYPOINT);
    });
    return (): void => {
      isCancelled = true;
    };
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline || hasCheckedPushSubscription.current || !isOnboardingComplete()) return;
    if (isNativeAppWebView() || readPreference('web-push-opted-out')) return;
    // without a session the server stores nothing; a skipped push step is a choice too
    if (isCookieTrue(Cookie.HAS_SKIPPED_AUTH) || isCookieTrue(Cookie.SKIP_PUSH_NOTIFICATION))
      return;

    hasCheckedPushSubscription.current = true;
    const restoreOrCheckIn = async (): Promise<void> => {
      // storing a restored subscription renews it on the server as well
      let isRestored = await restoreLostPushSubscription(locale);
      if (!isRestored) {
        const lastCheckIn = readPreference('web-push-checked-in-at');
        if (Date.now() - lastCheckIn < PUSH_CHECK_IN_INTERVAL_MS) return;
        const subscription = await getPushSubscription();
        if (subscription === undefined) return;
        const { confirmed } = await confirmPushSubscription(
          subscription.toJSON() as Parameters<typeof confirmPushSubscription>[0],
        );
        // the user may have turned push off while the check-in was on its way
        if (!confirmed && !readPreference('web-push-opted-out')) {
          // The server has no row for it: a send found the endpoint expired, or an admin
          // removed the device. A browser that is in use subscribes afresh, with an endpoint
          // that works, instead of staying silent while its switch still shows push as on.
          await subscription.unsubscribe();
          isRestored = await restoreLostPushSubscription(locale);
        }
      }
      // Subscribing can take seconds on a bad connection. A user who turned push off in the
      // meantime found nothing to unsubscribe, so the restore takes itself back.
      if (isRestored && readPreference('web-push-opted-out')) {
        await unsubscribeFromPushNotifications();
      }
      writePreference('web-push-checked-in-at', Date.now());
    };
    restoreOrCheckIn().catch((error: unknown) => {
      console.warn('Failed to restore or check in the push subscription', error);
    });
  }, [isOnline, locale, confirmPushSubscription]);

  useEffect(() => {
    if (!isOnboardingComplete() || isCookieTrue(Cookie.SKIP_PUSH_NOTIFICATION)) return;

    // The installed web app: without permission there is no subscription.
    if (
      !isNativeAppWebView() &&
      typeof Notification !== 'undefined' &&
      Notification.permission !== 'granted'
    ) {
      forgetOnboardingComplete();
    }

    // The native app reports its push state through the bridge.
    const handleNativePushEvent = (event: Event): void => {
      const detail =
        (event as CustomEvent<{ type?: string; payload?: Record<string, unknown> } | null>)
          .detail ?? {};
      if (detail.type !== 'native-push-status') return;
      if (!isNativePushActive(detail.payload ?? {})) forgetOnboardingComplete();
    };
    globalThis.addEventListener('app-webview-native-push-event', handleNativePushEvent);
    return (): void => {
      globalThis.removeEventListener('app-webview-native-push-event', handleNativePushEvent);
    };
  }, []);
};
