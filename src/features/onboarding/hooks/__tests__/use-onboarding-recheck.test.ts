/**
 * @jest-environment jsdom
 */

import { useOnboardingRecheck } from '@/features/onboarding/hooks/use-onboarding-recheck';
import { ONBOARDING_COMPLETE_KEY } from '@/lib/onboarding-complete';
import { Cookie } from '@/types/types';
import { replaceLocation } from '@/utils/assign-location';
import { getPushSubscription } from '@/utils/push-notifications/push-manager-utils';
import {
  restoreLostPushSubscription,
  unsubscribeFromPushNotifications,
} from '@/utils/push-notifications/push-subscription';
import { ANSWERED_BY_SERVICE_WORKER_HEADER } from '@/utils/service-worker-messages';
import { renderHook, waitFor } from '@testing-library/react';
import Cookies from 'js-cookie';

jest.mock('@/utils/assign-location', () => ({ replaceLocation: jest.fn() }));
jest.mock('@/utils/push-notifications/push-subscription', () => ({
  restoreLostPushSubscription: jest.fn(() => Promise.resolve(false)),
  unsubscribeFromPushNotifications: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/utils/push-notifications/push-manager-utils', () => ({
  getPushSubscription: jest.fn(() => Promise.resolve()),
}));
const mockConfirmPushSubscription = jest.fn(() => Promise.resolve({ confirmed: true }));
jest.mock('@/trpc/client', () => ({
  trpc: {
    pushTracking: {
      confirmWebPushSubscription: {
        useMutation: (): { mutateAsync: typeof mockConfirmPushSubscription } => ({
          mutateAsync: mockConfirmPushSubscription,
        }),
      },
    },
  },
}));
/** The preferences stored on this device, by key. */
const mockStoredPreferences = new Map<string, { key: string; value: unknown }>();
// jsdom has no IndexedDB for the collections the logout clears
jest.mock('@/lib/tanstack-db', () => ({
  starsCollection: { state: new Map(), delete: jest.fn() },
  userPreferencesCollection: {
    get state(): Map<string, unknown> {
      return mockStoredPreferences;
    },
    get: (key: string): unknown => mockStoredPreferences.get(key),
    has: (key: string): boolean => mockStoredPreferences.has(key),
    insert: (row: { key: string; value: unknown }): unknown =>
      mockStoredPreferences.set(row.key, row),
    update: (key: string, change: (draft: { key: string; value: unknown }) => void): void => {
      const draft = { key, value: undefined as unknown, ...mockStoredPreferences.get(key) };
      change(draft);
      mockStoredPreferences.set(key, draft);
    },
    delete: jest.fn(),
  },
}));

/** The session endpoint's answer; jsdom has no `Response`. */
const sessionAnswer = (body: unknown, fromWorkerCache = false): Response =>
  ({
    ok: true,
    headers: {
      has: (name: string) => fromWorkerCache && name === ANSWERED_BY_SERVICE_WORKER_HEADER,
    },
    json: () => Promise.resolve(body),
  }) as unknown as Response;

const lenaMuster = { user: { name: 'Lena Muster' }, expires: '2027-08-01T00:00:00.000Z' };

/** What the session endpoint answers for nobody. */
// next-auth answers `null`, not an empty body
const NOBODY = null;

describe('the background session check of an app started past the onboarding', () => {
  const originalFetch = globalThis.fetch;
  const replace = jest.mocked(replaceLocation);

  beforeEach(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    replace.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    globalThis.fetch = originalFetch;
  });

  it('sends a user whose session expired back to the login', async () => {
    globalThis.fetch = jest.fn(() => Promise.resolve(sessionAnswer(NOBODY)));
    renderHook(() => useOnboardingRecheck('fr'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entrypoint?session=expired'));
    // the next start runs the onboarding instead of skipping it
    expect(localStorage.getItem(ONBOARDING_COMPLETE_KEY)).toBeNull();
  });

  it('keeps a user with a valid session where they are', async () => {
    globalThis.fetch = jest.fn(() => Promise.resolve(sessionAnswer(lenaMuster)));
    renderHook(() => useOnboardingRecheck('fr'));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_COMPLETE_KEY)).toBe('true');
  });

  it('never logs anybody out on what the service worker answered from its cache', async () => {
    // on wifi without an uplink the worker answers in place of the server
    globalThis.fetch = jest.fn(() => Promise.resolve(sessionAnswer(NOBODY, true)));
    renderHook(() => useOnboardingRecheck('fr'));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_COMPLETE_KEY)).toBe('true');
  });

  it('does not ask while there is no connection', () => {
    globalThis.fetch = jest.fn();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    renderHook(() => useOnboardingRecheck('fr'));
    expect(globalThis.fetch).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});

describe('the background push check of an installed web app started past the onboarding', () => {
  const restore = jest.mocked(restoreLostPushSubscription);
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    restore.mockClear();
    // the session check runs next to it; its answer does not matter here
    globalThis.fetch = jest.fn(() => Promise.resolve(sessionAnswer(lenaMuster)));
  });

  afterEach(() => {
    localStorage.clear();
    mockStoredPreferences.clear();
    Cookies.remove(Cookie.SKIP_PUSH_NOTIFICATION);
    globalThis.fetch = originalFetch;
  });

  it('restores a lost subscription in the locale of the page', () => {
    renderHook(() => useOnboardingRecheck('fr'));
    expect(restore).toHaveBeenCalledWith('fr');
  });

  it('respects a user who turned push off on this device', () => {
    mockStoredPreferences.set('web-push-opted-out', { key: 'web-push-opted-out', value: true });
    renderHook(() => useOnboardingRecheck('fr'));
    expect(restore).not.toHaveBeenCalled();
  });

  it('respects a user who skipped the push step', () => {
    Cookies.set(Cookie.SKIP_PUSH_NOTIFICATION, 'true');
    renderHook(() => useOnboardingRecheck('fr'));
    expect(restore).not.toHaveBeenCalled();
  });

  it('takes a restore back when the user turned push off while it ran', async () => {
    restore.mockImplementationOnce(() => {
      // the user taps "off" in the settings while the subscribe is still on its way
      mockStoredPreferences.set('web-push-opted-out', { key: 'web-push-opted-out', value: true });
      return Promise.resolve(true);
    });
    renderHook(() => useOnboardingRecheck('fr'));

    await waitFor(() => expect(unsubscribeFromPushNotifications).toHaveBeenCalled());
  });

  it('waits for the onboarding, whose push step asks for itself', () => {
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    renderHook(() => useOnboardingRecheck('fr'));
    expect(restore).not.toHaveBeenCalled();
  });
});

/** When this device last checked in its push subscription, as stored. */
const checkedInAt = (): unknown => mockStoredPreferences.get('web-push-checked-in-at')?.value;

describe('the daily push check-in of an installed web app', () => {
  const restore = jest.mocked(restoreLostPushSubscription);
  const currentSubscription = jest.mocked(getPushSubscription);
  const originalFetch = globalThis.fetch;
  const lenasPhone = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/lena',
    keys: { p256dh: 'p256dh', auth: 'auth' },
  };

  beforeEach(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    restore.mockClear().mockResolvedValue(false);
    mockConfirmPushSubscription.mockClear();
    currentSubscription.mockResolvedValue({
      toJSON: () => lenasPhone,
    } as unknown as PushSubscription);
    globalThis.fetch = jest.fn(() => Promise.resolve(sessionAnswer(lenaMuster)));
  });

  afterEach(() => {
    localStorage.clear();
    mockStoredPreferences.clear();
    globalThis.fetch = originalFetch;
  });

  it('tells the server that a kept subscription is still in use', async () => {
    renderHook(() => useOnboardingRecheck('de'));

    await waitFor(() => expect(mockConfirmPushSubscription).toHaveBeenCalledWith(lenasPhone));
    await waitFor(() => expect(checkedInAt()).toEqual(expect.any(Number)));
  });

  it('checks in at most once a day', async () => {
    const anHourAgo = Date.now() - 60 * 60 * 1000;
    mockStoredPreferences.set('web-push-checked-in-at', {
      key: 'web-push-checked-in-at',
      value: anHourAgo,
    });
    renderHook(() => useOnboardingRecheck('de'));

    await waitFor(() => expect(restore).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockConfirmPushSubscription).not.toHaveBeenCalled();
    expect(checkedInAt()).toBe(anHourAgo);
  });

  it('subscribes afresh when the server no longer has the subscription', async () => {
    // a send found the endpoint expired and the server dropped the row
    const unsubscribe = jest.fn(() => Promise.resolve(true));
    currentSubscription.mockResolvedValue({
      toJSON: () => lenasPhone,
      unsubscribe,
    } as unknown as PushSubscription);
    mockConfirmPushSubscription.mockResolvedValueOnce({ confirmed: false });
    renderHook(() => useOnboardingRecheck('de'));

    await waitFor(() => expect(unsubscribe).toHaveBeenCalled());
    await waitFor(() => expect(restore).toHaveBeenCalledTimes(2));
  });

  it('counts a restored subscription as a check-in', async () => {
    restore.mockResolvedValue(true);
    renderHook(() => useOnboardingRecheck('de'));

    await waitFor(() => expect(checkedInAt()).toEqual(expect.any(Number)));
    expect(mockConfirmPushSubscription).not.toHaveBeenCalled();
  });
});
