/**
 * @jest-environment jsdom
 */

import { loadPostHog } from '@/lib/posthog-client';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/utils/analytics-consent';
import Cookies from 'js-cookie';
import type { CaptureResult } from 'posthog-js';

// Stands in for posthog-js: opted out until `opt_in_capturing`, like `opt_out_capturing_by_default`.
let optedIn = false;
const posthog = {
  init: jest.fn(),
  register: jest.fn(),
  unregister: jest.fn(),
  has_opted_in_capturing: jest.fn((): boolean => optedIn),
  has_opted_out_capturing: jest.fn((): boolean => !optedIn),
  opt_in_capturing: jest.fn((): void => {
    optedIn = true;
  }),
  opt_out_capturing: jest.fn((): void => {
    optedIn = false;
  }),
};

jest.mock('posthog-js', () => ({ __esModule: true, default: posthog }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_POSTHOG_KEY: 'phc_test' },
}));
jest.mock('@/build', () => ({
  __esModule: true,
  default: { version: '0.0.0', git: { hash: 'test' } },
}));

interface InitOptions {
  cookieless_mode: string;
  opt_out_capturing_by_default: boolean;
  before_send: (event: CaptureResult | null) => CaptureResult | null;
}

const initOptions = (): InitOptions => {
  const call = posthog.init.mock.calls[0] as [string, InitOptions];
  return call[1];
};

const event = (name: string): CaptureResult => ({ event: name, properties: {} }) as CaptureResult;

describe('analytics consent', () => {
  beforeEach(() => {
    setAnalyticsConsent('unanswered');
  });

  it('counts a missing or malformed answer as unanswered', () => {
    expect(getAnalyticsConsent()).toBe('unanswered');

    // The cookie of the banner this replaced must not carry over as consent.
    Cookies.set('conveniat-cookie-banner', 'true');
    Cookies.set('conveniat-analytics-consent', 'true');
    expect(getAnalyticsConsent()).toBe('unanswered');
  });

  // These run in order against the one module-level client, like a single page load does.
  it('starts PostHog cookieless before somebody answered', async () => {
    await expect(loadPostHog()).resolves.toBe(posthog);

    expect(initOptions().cookieless_mode).toBe('on_reject');
    expect(initOptions().opt_out_capturing_by_default).toBe(true);
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });

  it.each(['unanswered', 'denied'] as const)(
    'only lets page views and errors through while the answer is %s',
    (consent) => {
      setAnalyticsConsent(consent);
      const { before_send: beforeSend } = initOptions();

      expect(beforeSend(event('$pageview'))).not.toBeNull();
      expect(beforeSend(event('$pageleave'))).not.toBeNull();
      expect(beforeSend(event('$exception'))).not.toBeNull();
      expect(beforeSend(event('$autocapture'))).toBeNull();
      expect(beforeSend(event('$snapshot'))).toBeNull();
      expect(beforeSend(event('$$heatmap'))).toBeNull();
      expect(beforeSend(event('push_notification_opened'))).toBeNull();
    },
  );

  it('opts in once consent is granted and then lets every event through', async () => {
    setAnalyticsConsent('granted');

    await loadPostHog();
    await loadPostHog();
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(initOptions().before_send(event('$autocapture'))).not.toBeNull();
  });

  it('goes back to cookieless when consent is withdrawn', async () => {
    setAnalyticsConsent('denied');

    await loadPostHog();
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(initOptions().before_send(event('$autocapture'))).toBeNull();
  });
});
