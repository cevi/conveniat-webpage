import { OnboardingAction, OnboardingStep } from '@/features/onboarding/types';

export interface OnboardingContext {
  hasAcceptedCookieBanner: boolean;
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  hasSkippedLogin: boolean;
  hasSkippedPush: boolean;
  pushPermission: NotificationPermission;
  hasPushSubscription: boolean;
  offlineContentHandled: boolean;
  hasCachedContent: boolean;
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
    pushPermission,
    hasPushSubscription,
    offlineContentHandled,
    hasCachedContent,
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
  // If not authenticated and hasn't skipped login, go to Login
  if (!isAuth && !hasSkippedLogin) {
    return OnboardingStep.Login;
  }

  // Push Notification check
  // Show if: NO subscription AND NOT skipped AND NOT denied
  const showPush = !hasPushSubscription && !hasSkippedPush && pushPermission !== 'denied';
  if (showPush) {
    return OnboardingStep.PushNotifications;
  }

  // Offline Content check
  const showOffline = !offlineContentHandled && !hasCachedContent && !hasSkippedOffline;
  if (showOffline) {
    // If we are about to show offline content screen, BUT we are actually offline and have NO content,
    // we should show a "No Internet" screen instead of asking them if they want to download content they can't reach.
    // Or if we generally want to block access if offline and no cache.
    // The requirement says: If !isOnline AND !hasCachedContent -> NoInternet
    if (!isOnline) {
      return OnboardingStep.NoInternet;
    }
    return OnboardingStep.OfflineContent;
  }

  // General check: If we are effectively "done" (Loading), but offline and no cache, we can't load the app.
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
