/**
 * @jest-environment jsdom
 */

import { loadPostHog, stopPostHog } from '@/lib/posthog-client';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/utils/analytics-consent';
import Cookies from 'js-cookie';

const posthog = {
  init: jest.fn(),
  register: jest.fn(),
  unregister: jest.fn(),
  has_opted_out_capturing: jest.fn((): boolean => false),
  opt_in_capturing: jest.fn(),
  opt_out_capturing: jest.fn(),
  stopSessionRecording: jest.fn(),
};

jest.mock('posthog-js', () => ({ __esModule: true, default: posthog }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' },
}));
jest.mock('@/build', () => ({
  __esModule: true,
  default: { version: '0.0.0', git: { hash: 'test' } },
}));

describe('analytics consent', () => {
  beforeEach(() => {
    setAnalyticsConsent('unanswered');
    jest.clearAllMocks();
  });

  it('counts a missing or malformed answer as unanswered', () => {
    expect(getAnalyticsConsent()).toBe('unanswered');

    // The cookie of the banner this replaced must not carry over as consent.
    Cookies.set('conveniat-cookie-banner', 'true');
    Cookies.set('conveniat-analytics-consent', 'true');
    expect(getAnalyticsConsent()).toBe('unanswered');
  });

  // These run in order against the one module-level client, like a single page load does.
  it('does not start PostHog before somebody answered', async () => {
    await expect(loadPostHog()).resolves.toBeUndefined();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('does not start PostHog after a refusal', async () => {
    setAnalyticsConsent('denied');

    await expect(loadPostHog()).resolves.toBeUndefined();
    await stopPostHog();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();
  });

  it('starts PostHog once consent is granted, and only once', async () => {
    setAnalyticsConsent('granted');

    await expect(loadPostHog()).resolves.toBe(posthog);
    await expect(loadPostHog()).resolves.toBe(posthog);
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });

  it('stops capturing when consent is withdrawn and resumes when it is granted again', async () => {
    setAnalyticsConsent('denied');
    await stopPostHog();
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    await expect(loadPostHog()).resolves.toBeUndefined();

    posthog.has_opted_out_capturing.mockReturnValue(true);
    setAnalyticsConsent('granted');
    await expect(loadPostHog()).resolves.toBe(posthog);
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
  });
});
