/**
 * @jest-environment jsdom
 */

/**
 * `/entrypoint` and `/login` are in `i18nExcludedRoutes`, so the i18n proxy never runs on them
 * and this hook alone decides the onboarding language. It must never land on a locale the
 * deployment does not serve — the language switcher would not even offer it.
 */
import { useOnboardingLocale } from '@/features/onboarding/hooks/use-onboarding-locale';
import { OnboardingStep } from '@/features/onboarding/types';
import * as localesModule from '@/features/payload-cms/payload-cms/locales';
import { act, renderHook } from '@testing-library/react';

// `enabledLocales` is exposed as a getter over factory-local state: `@/types/types` reads it
// while this module is still being imported, so a `let` in the test body would be in its TDZ.
jest.mock('@/features/payload-cms/payload-cms/locales', () => {
  const state = { enabled: ['de', 'fr', 'en'] };

  return {
    LOCALE: { DE: 'de', FR: 'fr', EN: 'en' },
    get enabledLocales(): string[] {
      return state.enabled;
    },
    __setEnabledLocales: (enabled: string[]): void => {
      state.enabled = enabled;
    },
  };
});

const setEnabledLocales = (enabled: string[]): void =>
  (localesModule as unknown as { __setEnabledLocales: (l: string[]) => void }).__setEnabledLocales(
    enabled,
  );

const mockCookieGet = jest.fn<string | undefined, [string]>();
const mockCookieSet = jest.fn<void, unknown[]>();

jest.mock('js-cookie', () => ({
  __esModule: true,
  default: {
    get: (name: string): string | undefined => mockCookieGet(name),
    set: (...arguments_: unknown[]): void => mockCookieSet(...arguments_),
  },
}));

const setBrowserLanguage = (language: string): void => {
  Object.defineProperty(navigator, 'language', { value: language, configurable: true });
};

const renderOnboardingLocale = (enabledLocales: string[]): string => {
  setEnabledLocales(enabledLocales);

  const { result } = renderHook(() => useOnboardingLocale(OnboardingStep.Login));

  // the hook defers the update by a tick to stay clear of hydration
  act(() => {
    jest.advanceTimersByTime(1);
  });

  return result.current.locale;
};

describe('useOnboardingLocale', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setEnabledLocales(['de', 'fr', 'en']);
    mockCookieGet.mockReset();
    mockCookieSet.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('falls back to English for an unserved browser language when English is served', () => {
    setBrowserLanguage('it-CH');

    expect(renderOnboardingLocale(['de', 'fr', 'en'])).toBe('en');
  });

  it('falls back to the default locale when English is not served', () => {
    setBrowserLanguage('it-CH');

    expect(renderOnboardingLocale(['de', 'fr'])).toBe('de');
    // a locale the deployment cannot serve must never be persisted for 730 days
    expect(mockCookieSet.mock.calls.some((call) => call[1] === 'en')).toBe(false);
  });

  it('ignores a stale cookie naming a locale the deployment no longer serves', () => {
    setBrowserLanguage('de-CH');
    mockCookieGet.mockReturnValue('en');

    expect(renderOnboardingLocale(['de', 'fr'])).toBe('de');
  });

  it('still honours a browser language the deployment does serve', () => {
    setBrowserLanguage('fr-CH');

    expect(renderOnboardingLocale(['de', 'fr'])).toBe('fr');
  });
});
