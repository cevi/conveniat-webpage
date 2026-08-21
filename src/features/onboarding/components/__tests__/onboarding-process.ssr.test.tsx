import { OnboardingProcessContent } from '@/features/onboarding/components/onboarding-process';
import { OnboardingStep } from '@/features/onboarding/types';
import { renderToString } from 'react-dom/server';

/**
 * Regression test for the "blank onboarding card" report (2026-08-21, iOS, Konekta app).
 *
 * The user saw the logo, title, language globe and progress dots, but an empty card - no
 * loading bar, no cookie banner, nothing to press. PostHog had no event from the device, so
 * client JS never ran: what they were looking at was the server-rendered HTML.
 *
 * framer-motion serialises `initial` values as inline styles on the server. With the onboarding
 * screen wrapped in `initial={{ opacity: 0 }}` the SSR markup shipped the whole card invisible,
 * while the globe and the dots (`initial={false}`) shipped fully visible - exactly the frame in
 * the screenshot. Whether the animation ever runs is the client's problem; the server must never
 * emit an invisible onboarding screen.
 *
 * This renders the component the way the server does and asserts on the raw HTML string, so it
 * is independent of any animation driver.
 */

let mockedStep: OnboardingStep = OnboardingStep.Checking;

jest.mock('@/features/onboarding/hooks/use-onboarding', () => ({
  useOnboarding: (): Record<string, unknown> => ({
    locale: 'de',
    onboardingStep: mockedStep,
    handleLanguageChange: jest.fn(),
    acceptCookiesCallback: jest.fn(),
    handlePushNotification: jest.fn(),
    handleOfflineContent: jest.fn(),
    setOnboardingStep: jest.fn(),
    handleSkipLogin: jest.fn(),
  }),
}));

// Sibling steps pull in tRPC, next-auth and the service worker; they are not under test here.
jest.mock('@/features/onboarding/components/language-switcher', () => ({
  LanguageSwitcher: (): undefined => undefined,
}));
jest.mock('@/features/onboarding/components/login-screen', () => ({
  LoginScreen: (): undefined => undefined,
  loginDismissText: { de: '', fr: '', en: '' },
}));
jest.mock('@/features/onboarding/components/push-notification-manager', () => ({
  PushNotificationManagerEntrypointComponent: (): undefined => undefined,
  skipPushNotificationText: { de: '', fr: '', en: '' },
}));
jest.mock('@/features/onboarding/components/offline-content-component', () => ({
  OfflineContentEntrypointComponent: (): undefined => undefined,
}));
jest.mock('@/features/onboarding/components/no-internet-component', () => ({
  NoInternetComponent: (): undefined => undefined,
}));

const INVISIBLE = /opacity:\s*0(?![.\d])/;

describe('OnboardingProcessContent server-rendered markup', () => {
  it('ships the loading bar visible while the auth check is pending', () => {
    mockedStep = OnboardingStep.Checking;
    const html = renderToString(<OnboardingProcessContent />);

    expect(html).toContain('animate-loading');
    expect(html).not.toMatch(INVISIBLE);
  });

  it('ships the cookie banner and its accept button visible', () => {
    mockedStep = OnboardingStep.Initial;
    const html = renderToString(<OnboardingProcessContent />);

    expect(html).toContain('bg-red-700');
    expect(html).not.toMatch(INVISIBLE);
  });
});
