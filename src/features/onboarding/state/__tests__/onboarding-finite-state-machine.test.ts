import {
  determineNextStep,
  initialOnboardingContext,
  initialOnboardingState,
  onboardingReducer,
} from '@/features/onboarding/state/onboarding-finite-state-machine';
import { OnboardingStep } from '@/features/onboarding/types';

describe('Onboarding Finite State Machine', () => {
  describe('determineNextStep', () => {
    it('should return Initial if cookie banner not accepted', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: false,
      });
      expect(step).toBe(OnboardingStep.Initial);
    });

    it('should return Checking if auth is loading', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'loading',
      });
      expect(step).toBe(OnboardingStep.Checking);
    });

    it('should return Login if not authenticated and not skipped', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'unauthenticated',
        hasSkippedLogin: false,
      });
      expect(step).toBe(OnboardingStep.Login);
    });

    it('should return PushNotifications if authenticated (skip login not needed) and no subscription', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'authenticated',
        hasPushSubscription: false,
      });
      expect(step).toBe(OnboardingStep.PushNotifications);
    });

    it('should return PushNotifications if unauthenticated but skipped login', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'unauthenticated',
        hasSkippedLogin: true,
      });
      expect(step).toBe(OnboardingStep.PushNotifications);
    });

    it('should return OfflineContent if push is handled (skipped) and offline not handled', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'authenticated', // or unauthenticated + skipped
        hasPushSubscription: false,
        hasSkippedPush: true,
        offlineContentHandled: false,
        hasCachedContent: false,
      });
      expect(step).toBe(OnboardingStep.OfflineContent);
    });

    it('should return Loading if everything is handled', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'authenticated',
        hasPushSubscription: true,
        offlineContentHandled: true,
      });
      expect(step).toBe(OnboardingStep.Loading);
    });
  });

  describe('onboardingReducer', () => {
    it('should handle USER_ACTION_ACCEPT_COOKIES', () => {
      const state = onboardingReducer(initialOnboardingState, {
        type: 'USER_ACTION_ACCEPT_COOKIES',
      });
      expect(state.context.hasAcceptedCookieBanner).toBe(true);
      // Expected next step depends on auth, which defaults to loading
      expect(state.step).toBe(OnboardingStep.Checking);
    });

    it('should transition to Login when auth finishes and is unauthenticated', () => {
      const startState = {
        step: OnboardingStep.Checking,
        context: {
          ...initialOnboardingContext,
          hasAcceptedCookieBanner: true,
          authStatus: 'loading' as const,
        },
      };

      const newState = onboardingReducer(startState, {
        type: 'UPDATE_CONTEXT',
        payload: { authStatus: 'unauthenticated' },
      });

      expect(newState.step).toBe(OnboardingStep.Login);
    });

    it('should handle USER_ACTION_SKIP_LOGIN', () => {
      const startState = {
        step: OnboardingStep.Login,
        context: {
          ...initialOnboardingContext,
          hasAcceptedCookieBanner: true,
          authStatus: 'unauthenticated' as const,
        },
      };

      const newState = onboardingReducer(startState, { type: 'USER_ACTION_SKIP_LOGIN' });
      expect(newState.context.hasSkippedLogin).toBe(true);
      expect(newState.step).toBe(OnboardingStep.PushNotifications);
    });

    it('should handle USER_ACTION_SKIP_PUSH', () => {
      const startState = {
        step: OnboardingStep.PushNotifications,
        context: {
          ...initialOnboardingContext,
          hasAcceptedCookieBanner: true,
          authStatus: 'authenticated' as const,
          hasSkippedLogin: false,
          hasPushSubscription: false,
          // Assuming default permissions
        },
      };

      const newState = onboardingReducer(startState, { type: 'USER_ACTION_SKIP_PUSH' });
      expect(newState.context.hasSkippedPush).toBe(true);
      expect(newState.step).toBe(OnboardingStep.OfflineContent);
    });

    it('should handle USER_ACTION_HANDLE_OFFLINE', () => {
      const startState = {
        step: OnboardingStep.OfflineContent,
        context: {
          ...initialOnboardingContext,
          hasAcceptedCookieBanner: true,
          authStatus: 'authenticated' as const,
          hasPushSubscription: true, // skipped past push
          offlineContentHandled: false,
        },
      };

      const newState = onboardingReducer(startState, {
        type: 'USER_ACTION_HANDLE_OFFLINE',
        accepted: true,
      });
      expect(newState.context.offlineContentHandled).toBe(true);
      expect(newState.step).toBe(OnboardingStep.Loading);
    });
  });

  describe('Edge Cases & Failures', () => {
    it('should fallback correctly if SW cache check fails (defaults remain false)', () => {
      // If cache check fails, hasCachedContent remains false.
      // This should lead to OfflineContent step if not handled.
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'authenticated',
        hasPushSubscription: true,
        offlineContentHandled: false,
        hasCachedContent: false, // failed to find content
      });
      expect(step).toBe(OnboardingStep.OfflineContent);
    });

    it('should proceed if cache check finds content even if not handled explicitly in DB', () => {
      const step = determineNextStep({
        ...initialOnboardingContext,
        hasAcceptedCookieBanner: true,
        authStatus: 'authenticated',
        hasPushSubscription: true,
        offlineContentHandled: false,
        hasCachedContent: true, // Cache found!
      });
      // Logic: !offlineHandled && !hasCachedContent ...
      // !false && !true -> true && false -> false.
      // So showOffline is false.
      expect(step).toBe(OnboardingStep.Loading);
    });
  });
});
