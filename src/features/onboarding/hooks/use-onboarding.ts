'use client';

import { useNativePushSubscriptionStatus } from '@/features/onboarding/hooks/use-native-push-subscription-status';
import { useOnboardingLocale } from '@/features/onboarding/hooks/use-onboarding-locale';
import { useOnboardingStorage } from '@/features/onboarding/hooks/use-onboarding-storage';
import type { cookieInfoText } from '@/features/onboarding/onboarding-constants';
import {
  initialOnboardingState,
  onboardingReducer,
} from '@/features/onboarding/state/onboarding-finite-state-machine';
import { OnboardingAction, OnboardingStep } from '@/features/onboarding/types';
import { extractTargetUrl, performReliablePushNavigation } from '@/hooks/use-native-push';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePushNotificationState } from '@/hooks/use-push-notification-state';
import { Cookie } from '@/types/types';
import { isSafariOnAppleDevice } from '@/utils/browser-detection';
import { isCookieTrue } from '@/utils/cookie-utils';
import { DesignCodes, DesignModeTriggers } from '@/utils/design-codes';
import { handleSkipLogin as skipLoginUtil } from '@/utils/login-handler';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import { isNativeAppWebView } from '@/utils/standalone-check';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

export const useOnboarding = (): UseOnboardingReturn => {
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const { step: onboardingStep } = state;

  // 1. Locale Logic
  const { locale, handleLanguageChange } = useOnboardingLocale(onboardingStep);

  // 2. Storage Logic (DB & Cache)
  const {
    offlineContentHandled,
    hasCachedContent,
    handleOfflineContent: handleOfflineContentStorage,
  } = useOnboardingStorage();

  const handleOfflineContent = useCallback(
    (accepted: boolean): void => {
      handleOfflineContentStorage(accepted);
      dispatch({
        type: OnboardingAction.USER_ACTION_HANDLE_OFFLINE,
        accepted,
      });
    },
    [handleOfflineContentStorage],
  );

  // 3. Online Status (Reusing existing hook)
  const isOnline = useOnlineStatus();

  // 4. Push Notification Status (Reusing existing hook)
  const { isSubscribed: hasPushSubscription } = usePushNotificationState({ locale });

  // 5. Native Push Subscription Status (lightweight, no tRPC dependency)
  const hasNativePushSubscription = useNativePushSubscriptionStatus();

  const { status } = useSession();
  const [authTimeoutReached, setAuthTimeoutReached] = useState(false);
  const searchParameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Fallback timeout if NextAuth session check hangs or delays (e.g. during database/Redis connection issues)
  useEffect(() => {
    if (status !== 'loading') return;

    const timer = setTimeout(() => {
      setAuthTimeoutReached(true);
    }, 3000);

    return (): void => clearTimeout(timer);
  }, [status]);

  const effectiveAuthStatus =
    status === 'loading' && authTimeoutReached ? 'unauthenticated' : status;

  // Mounted check still useful for effects that might run after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    return (): void => {
      isMounted.current = false;
    };
  }, []);

  // Sync Auth Status & Cookies to FSM Context
  useEffect(() => {
    const hasAcceptedCookieBanner = isCookieTrue(Cookie.CONVENIAT_COOKIE_BANNER);
    const hasSkippedAuth = isCookieTrue(Cookie.HAS_SKIPPED_AUTH);
    const hasSkippedPush = isCookieTrue(Cookie.SKIP_PUSH_NOTIFICATION);
    const hasSkippedOffline = isCookieTrue(Cookie.OFFLINE_CONTENT_HANDLED);

    // Get Push Permission synchronously if possible, or assume 'default' until checked
    let pushPermission: NotificationPermission = 'default';
    if (typeof Notification !== 'undefined') {
      pushPermission = Notification.permission;
    }

    dispatch({
      type: OnboardingAction.UPDATE_CONTEXT,
      payload: {
        hasAcceptedCookieBanner,
        authStatus: effectiveAuthStatus,
        hasSkippedLogin: hasSkippedAuth,
        hasSkippedPush,
        hasSkippedOffline,
        isOnline,
        offlineContentHandled,
        hasCachedContent,
        pushPermission,
        // In native mode, derive hasPushSubscription from the native bridge status
        // (which reports FCM token + authorization). In web mode, use the Web Push
        // subscription check from usePushNotificationState.
        hasPushSubscription: isNativeAppWebView() ? hasNativePushSubscription : hasPushSubscription,
      },
    });
  }, [
    effectiveAuthStatus,
    isOnline,
    offlineContentHandled,
    hasCachedContent,
    hasPushSubscription,
    hasNativePushSubscription,
  ]);

  // Clear skip auth cookie if signalled by query param
  useEffect(() => {
    if (searchParameters.get('clearSkip') === 'true') {
      Cookies.remove(Cookie.HAS_SKIPPED_AUTH);
      dispatch({
        type: OnboardingAction.UPDATE_CONTEXT,
        payload: { hasSkippedLogin: false },
      });
    }
  }, [searchParameters]);

  // Re-sync push status & cookies when app regains focus (e.g. returning from device settings)
  useEffect(() => {
    const handleFocus = (): void => {
      const hasSkippedPush = isCookieTrue(Cookie.SKIP_PUSH_NOTIFICATION);
      dispatch({
        type: OnboardingAction.UPDATE_CONTEXT,
        payload: {
          hasSkippedPush,
        },
      });
      if (isNativeAppWebView()) {
        globalThis.AppWebViewNativePush?.getStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return (): void => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const acceptCookiesCallback = useCallback((): void => {
    dispatch({ type: OnboardingAction.USER_ACTION_ACCEPT_COOKIES });
  }, []);

  const handlePushNotification = useCallback((): void => {
    const hasSkipped = isCookieTrue(Cookie.SKIP_PUSH_NOTIFICATION);
    if (hasSkipped) {
      dispatch({ type: OnboardingAction.USER_ACTION_SKIP_PUSH });
    } else if (isNativeAppWebView()) {
      // Native push was granted via FCM — no Web Push subscription exists, advance directly
      dispatch({ type: OnboardingAction.UPDATE_CONTEXT, payload: { hasPushSubscription: true } });
    } else {
      // Refresh push subscription status and update context
      void getPushSubscription().then((sub) => {
        dispatch({
          type: OnboardingAction.UPDATE_CONTEXT,
          payload: { hasPushSubscription: !!sub },
        });
      });
    }
  }, []);

  // Design Mode Effect
  useEffect(() => {
    const forceAppMode = searchParameters.get(DesignModeTriggers.QUERY_PARAM_FORCE) === 'true';
    const isWebkitBasedBrowser = isSafariOnAppleDevice();
    const currentMode = Cookies.get(Cookie.DESIGN_MODE);

    let shouldUpdateCookie = false;
    let shouldRedirect = false;

    if (forceAppMode) {
      shouldUpdateCookie = true;
      shouldRedirect = true;
    } else if (isWebkitBasedBrowser && currentMode !== DesignCodes.APP_DESIGN) {
      shouldUpdateCookie = true;
      // No need to redirect if we're just setting the cookie based on browser detection
    }

    if (shouldUpdateCookie) {
      Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { expires: 730 });
    }

    if (shouldRedirect) {
      const params = new URLSearchParams(searchParameters.toString());
      params.delete(DesignModeTriggers.QUERY_PARAM_FORCE);
      // Construct the new URL carefully to avoid empty query strings
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl);
    }
  }, [searchParameters, pathname, router]);

  const setOnboardingStep = useCallback((): void => {
    // Manual step forcing is ignored in favor of FSM context evaluation
    dispatch({ type: OnboardingAction.EVALUATE_NEXT_STEP });
  }, []);

  const handleSkipLogin = useCallback((): void => {
    skipLoginUtil();
    dispatch({ type: OnboardingAction.USER_ACTION_SKIP_LOGIN });
  }, []);

  // Listen for late native push open events arriving during onboarding on cold start
  useEffect(() => {
    const handleNativePushEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<
        | {
            type?: string;
            payload?: Record<string, unknown>;
          }
        | null
        | undefined
      >;
      const detail = customEvent.detail;
      if (detail?.type === 'native-push-open') {
        const targetUrl = extractTargetUrl(detail.payload ?? {});
        if (targetUrl) {
          console.log(
            '[Onboarding] Native push open event received, executing navigation to:',
            targetUrl,
          );
          performReliablePushNavigation(router, targetUrl);
        }
      }
    };

    globalThis.addEventListener('app-webview-native-push-event', handleNativePushEvent);
    return (): void => {
      globalThis.removeEventListener('app-webview-native-push-event', handleNativePushEvent);
    };
  }, [router]);

  // Redirect to target destination or dashboard when finished
  useEffect(() => {
    if (onboardingStep === OnboardingStep.Loading) {
      try {
        const pendingRedirect =
          sessionStorage.getItem('pending_push_redirect') ??
          localStorage.getItem('pending_push_redirect');
        if (pendingRedirect) {
          sessionStorage.removeItem('pending_push_redirect');
          localStorage.removeItem('pending_push_redirect');
          console.log('[Onboarding] Pending push redirect found, navigating to:', pendingRedirect);
          performReliablePushNavigation(router, pendingRedirect);
          return;
        }
      } catch {
        // ignore SSR / storage unavailable
      }

      const redirectToParameter =
        searchParameters.get('redirectTo') ??
        searchParameters.get('url') ??
        searchParameters.get('path');
      const chatIdParameter = searchParameters.get('chatId');

      if (redirectToParameter) {
        console.log('[Onboarding] Query param redirect found, navigating to:', redirectToParameter);
        performReliablePushNavigation(router, redirectToParameter);
        return;
      }

      if (chatIdParameter) {
        const target = `/app/chat/${chatIdParameter}`;
        console.log('[Onboarding] Query param chatId found, navigating to:', target);
        performReliablePushNavigation(router, target);
        return;
      }

      const shareText = searchParameters.get('text');
      const shareTitle = searchParameters.get('title');
      const shareUrl = searchParameters.get('url');

      if (shareText !== null || shareTitle !== null || shareUrl !== null) {
        const params = new URLSearchParams();
        if (shareText !== null) params.set('text', shareText);
        if (shareTitle !== null) params.set('title', shareTitle);
        if (shareUrl !== null) params.set('url', shareUrl);
        router.push(`/app/chat?${params.toString()}`);
      } else {
        router.push('/app/dashboard');
      }
    }
  }, [onboardingStep, router, searchParameters]);

  return {
    locale,
    onboardingStep,
    handleLanguageChange,
    acceptCookiesCallback,
    handlePushNotification,
    handleOfflineContent,
    setOnboardingStep,
    handleSkipLogin,
  };
};

export interface UseOnboardingReturn {
  locale: keyof typeof cookieInfoText;
  onboardingStep: OnboardingStep;
  handleLanguageChange: (newLocale: string) => void;
  acceptCookiesCallback: () => void;
  handlePushNotification: () => void;
  handleOfflineContent: (accepted: boolean) => void;
  setOnboardingStep: () => void;
  handleSkipLogin: () => void;
}
