/**
 * @jest-environment jsdom
 */

import { useOnboardingRecheck } from '@/features/onboarding/hooks/use-onboarding-recheck';
import { ONBOARDING_COMPLETE_KEY } from '@/lib/onboarding-complete';
import { replaceLocation } from '@/utils/assign-location';
import { ANSWERED_BY_SERVICE_WORKER_HEADER } from '@/utils/service-worker-messages';
import { renderHook, waitFor } from '@testing-library/react';

jest.mock('@/utils/assign-location', () => ({ replaceLocation: jest.fn() }));
// jsdom has no IndexedDB for the collections the logout clears
jest.mock('@/lib/tanstack-db', () => ({
  starsCollection: { state: new Map(), delete: jest.fn() },
  userPreferencesCollection: { state: new Map(), delete: jest.fn() },
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
    renderHook(() => useOnboardingRecheck());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entrypoint?session=expired'));
    // the next start runs the onboarding instead of skipping it
    expect(localStorage.getItem(ONBOARDING_COMPLETE_KEY)).toBeNull();
  });

  it('keeps a user with a valid session where they are', async () => {
    globalThis.fetch = jest.fn(() => Promise.resolve(sessionAnswer(lenaMuster)));
    renderHook(() => useOnboardingRecheck());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_COMPLETE_KEY)).toBe('true');
  });

  it('never logs anybody out on what the service worker answered from its cache', async () => {
    // on wifi without an uplink the worker answers in place of the server
    globalThis.fetch = jest.fn(() => Promise.resolve(sessionAnswer(NOBODY, true)));
    renderHook(() => useOnboardingRecheck());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_COMPLETE_KEY)).toBe('true');
  });

  it('does not ask while there is no connection', () => {
    globalThis.fetch = jest.fn();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    renderHook(() => useOnboardingRecheck());
    expect(globalThis.fetch).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});
