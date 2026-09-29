import { OnboardingAction, OnboardingStep } from '@/features/onboarding/types';

export interface OnboardingContext {
  hasAcceptedCookieBanner: boolean;
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  hasSkippedLogin: boolean;
  hasSkippedPush: boolean;
  pushPermission: NotificationPermission;
  hasPushSubscription: boolean;
  offlineContentHandled: boolean;
  /** The app can start without a connection: the page the entrypoint hands over to is cached. */
  hasCachedContent: boolean;
  /** The offline download ran to the end, so there is nothing left to offer. */
  hasDownloadedContent: boolean;
  hasSkippedOffline: boolean;
  isOnline: boolean;
}

export interface OnboardingState {
  step: OnboardingStep;
  context: OnboardingContext;
}

export type OnboardingEvent =
  | { type: OnboardingAction.UPDATE_CONTEXT; payload: Partial<OnboardingContext> }
  | { type: OnboardingAction.EVALUATE_NEXT_STEP }
  | { type: OnboardingAction.USER_ACTION_ACCEPT_COOKIES }
  | { type: OnboardingAction.USER_ACTION_SKIP_LOGIN }
  | { type: OnboardingAction.USER_ACTION_SKIP_PUSH }
  | { type: OnboardingAction.USER_ACTION_HANDLE_OFFLINE; accepted: boolean };

export const initialOnboardingContext: OnboardingContext = {
  hasAcceptedCookieBanner: false,
  authStatus: 'loading',
  hasSkippedLogin: false,
  hasSkippedPush: false,
  pushPermission: 'default',
  hasPushSubscription: false,
  offlineContentHandled: false,
  hasCachedContent: false,
  hasDownloadedContent: false,
  hasSkippedOffline: false,
  isOnline: true,
};

export const initialOnboardingState: OnboardingState = {
  step: OnboardingStep.Checking,
  context: initialOnboardingContext,
};

/**
 * Pure function to determine the next step based on the current context.
 * This encapsulates the business rules for the onboarding flow.
 */
export const determineNextStep = (context: OnboardingContext): OnboardingStep => {
  const {
    hasAcceptedCookieBanner,
    authStatus,
    hasSkippedLogin,
    hasSkippedPush,
    hasPushSubscription,
    offlineContentHandled,
    hasCachedContent,
    hasDownloadedContent,
    hasSkippedOffline,
    isOnline,
  } = context;

  if (!hasAcceptedCookieBanner) {
    return OnboardingStep.Initial;
  }

  if (authStatus === 'loading') {
    return OnboardingStep.Checking;
  }

  // Auth check
  const isAuth = authStatus === 'authenticated';
  // If not authenticated and hasn't skipped login, go to Login. Offline, the session request
  // fails and reports 'unauthenticated' even for a logged-in user, and the Cevi.DB login could
  // not complete anyway, so let the user through to the cached app instead.
  if (!isAuth && !hasSkippedLogin && isOnline) {
    return OnboardingStep.Login;
  }

  // Push Notification check
  // Show if: NO subscription AND NOT skipped
  const showPush = !hasPushSubscription && !hasSkippedPush;
  if (showPush) {
    return OnboardingStep.PushNotifications;
  }

  // Offer the offline download until it was handled, skipped or has run. Offline there is
  // nothing to download, so the offer waits for the connection.
  const showOffline = !offlineContentHandled && !hasDownloadedContent && !hasSkippedOffline;
  if (showOffline && isOnline) {
    return OnboardingStep.OfflineContent;
  }

  // Offline, the app can only start from the cache.
  if (!isOnline && !hasCachedContent) {
    return OnboardingStep.NoInternet;
  }

  // If all checks pass, we are done
  return OnboardingStep.Loading;
};

export const onboardingReducer = (
  state: OnboardingState,
  event: OnboardingEvent,
): OnboardingState => {
  switch (event.type) {
    case OnboardingAction.UPDATE_CONTEXT: {
      const newContext = { ...state.context, ...event.payload };
      const nextStep = determineNextStep(newContext);
      return {
        step: nextStep,
        context: newContext,
      };
    }

    case OnboardingAction.EVALUATE_NEXT_STEP: {
      return {
        ...state,
        step: determineNextStep(state.context),
      };
    }

    case OnboardingAction.USER_ACTION_ACCEPT_COOKIES: {
      const newContext = { ...state.context, hasAcceptedCookieBanner: true };
      return {
        step: determineNextStep(newContext),
        context: newContext,
      };
    }

    case OnboardingAction.USER_ACTION_SKIP_LOGIN: {
      const newContext = { ...state.context, hasSkippedLogin: true };
      return {
        step: determineNextStep(newContext),
        context: newContext,
      };
    }

    case OnboardingAction.USER_ACTION_SKIP_PUSH: {
      const newContext = { ...state.context, hasSkippedPush: true };
      return {
        step: determineNextStep(newContext),
        context: newContext,
      };
    }

    case OnboardingAction.USER_ACTION_HANDLE_OFFLINE: {
      const newContext = {
        ...state.context,
        offlineContentHandled: true,
        hasSkippedOffline: !event.accepted,
      };
      return {
        step: determineNextStep(newContext),
        context: newContext,
      };
    }

    default: {
      return state;
    }
  }
};
