'use client';

import { useOnboardingLocale } from '@/features/onboarding/hooks/use-onboarding-locale';
import { useOnboardingStorage } from '@/features/onboarding/hooks/use-onboarding-storage';
import type { cookieInfoText } from '@/features/onboarding/onboarding-constants';
import {
  initialOnboardingState,
  onboardingReducer,
} from '@/features/onboarding/state/onboarding-finite-state-machine';
import { OnboardingAction, OnboardingStep } from '@/features/onboarding/types';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePushNotificationState } from '@/hooks/use-push-notification-state';
import { Cookie } from '@/types/types';
import { isSafariOnAppleDevice } from '@/utils/browser-detection';
import { isCookieTrue } from '@/utils/cookie-utils';
import { DesignCodes, DesignModeTriggers } from '@/utils/design-codes';
import { handleSkipLogin as skipLoginUtil } from '@/utils/login-handler';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useCallback, useEffect, useReducer, useRef } from 'react';

export const useOnboarding = (): UseOnboardingReturn => {
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const { step: onboardingStep } = state;

  // 1. Locale Logic
  const { locale, handleLanguageChange } = useOnboardingLocale(onboardingStep);

  // 2. Storage Logic (DB & Cache)
  const { offlineContentHandled, hasCachedContent, handleOfflineContent } = useOnboardingStorage();

  // 3. Online Status (Reusing existing hook)
  const isOnline = useOnlineStatus();

  // 4. Push Notification Status (Reusing existing hook)
  const { isSubscribed: hasPushSubscription } = usePushNotificationState();

  const { status } = useSession();
  const searchParameters = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

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
        authStatus: status,
        hasSkippedLogin: hasSkippedAuth,
        hasSkippedPush,
        hasSkippedOffline,
        isOnline,
        offlineContentHandled,
        hasCachedContent,
        pushPermission,
        hasPushSubscription,
      },
    });
  }, [status, isOnline, offlineContentHandled, hasCachedContent, hasPushSubscription]);

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

  const acceptCookiesCallback = useCallback((): void => {
    dispatch({ type: OnboardingAction.USER_ACTION_ACCEPT_COOKIES });
  }, []);

  const handlePushNotification = useCallback((): void => {
    const hasSkipped = isCookieTrue(Cookie.SKIP_PUSH_NOTIFICATION);
    if (hasSkipped) {
      dispatch({ type: OnboardingAction.USER_ACTION_SKIP_PUSH });
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
    if (forceAppMode || isWebkitBasedBrowser) {
      Cookies.set(Cookie.DESIGN_MODE, DesignCodes.APP_DESIGN, { expires: 730 });
      const params = new URLSearchParams(searchParameters.toString());
      params.delete(DesignModeTriggers.QUERY_PARAM_FORCE);
      router.replace(`${pathname}?${params.toString()}`);
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

  // Redirect to dashboard when finished
  useEffect(() => {
    if (onboardingStep === OnboardingStep.Loading) {
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
