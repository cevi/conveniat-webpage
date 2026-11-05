/**
 * @jest-environment jsdom
 */
import { OnboardingProcessContent } from '@/features/onboarding/components/onboarding-process';
import { OnboardingStep } from '@/features/onboarding/types';
import { writePreference } from '@/lib/preferences';
import { fireEvent, render, screen } from '@testing-library/react';

const mockHandlePushNotification = jest.fn();
jest.mock('@/features/onboarding/hooks/use-onboarding', () => ({
  useOnboarding: (): Record<string, unknown> => ({
    locale: 'de',
    onboardingStep: OnboardingStep.PushNotifications,
    handleLanguageChange: jest.fn(),
    answerCookiesCallback: jest.fn(),
    handlePushNotification: mockHandlePushNotification,
    handleOfflineContent: jest.fn(),
    setOnboardingStep: jest.fn(),
    handleSkipLogin: jest.fn(),
  }),
}));
jest.mock('@/lib/preferences', () => ({ writePreference: jest.fn() }));
// The same stubs as the server-render test: env validation, tRPC, next-auth and the worker.
jest.mock('@/features/onboarding/components/centered-conveniat-logo', () => ({
  CenteredConveniatLogo: (): undefined => undefined,
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' },
}));
jest.mock('@/features/onboarding/components/language-switcher', () => ({
  LanguageSwitcher: (): undefined => undefined,
}));
jest.mock('@/features/onboarding/components/login-screen', () => ({
  LoginScreen: (): undefined => undefined,
  loginDismissText: { de: '', fr: '', en: '' },
}));
jest.mock('@/features/onboarding/components/push-notification-manager', () => ({
  PushNotificationManagerEntrypointComponent: (): undefined => undefined,
  skipPushNotificationText: { de: 'Überspringen', fr: 'Passer', en: 'Skip' },
}));
jest.mock('@/features/onboarding/components/offline-content-component', () => ({
  OfflineContentEntrypointComponent: (): undefined => undefined,
}));
jest.mock('@/features/onboarding/components/no-internet-component', () => ({
  NoInternetComponent: (): undefined => undefined,
}));

/**
 * The app subscribes a browser again on start when it has the permission but no subscription.
 * On a shared phone the permission can be an earlier user's, so skipping the push step has to
 * be remembered beyond the week its cookie lasts.
 */
describe('skipping the push step of the onboarding', () => {
  it('records that this person does not want push on the device', () => {
    render(<OnboardingProcessContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }));

    expect(writePreference).toHaveBeenCalledWith('web-push-opted-out', true);
    expect(mockHandlePushNotification).toHaveBeenCalled();
  });
});
