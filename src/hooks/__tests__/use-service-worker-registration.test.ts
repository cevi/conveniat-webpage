/**
 * @jest-environment jsdom
 */

import type { RegistrableServiceWorker } from '@/hooks/use-service-worker-registration';
import { useServiceWorkerRegistration } from '@/hooks/use-service-worker-registration';
import { renderHook, waitFor } from '@testing-library/react';

const registration = { waiting: undefined } as unknown as ServiceWorkerRegistration;

const succeedingServiceWorker = (): RegistrableServiceWorker => ({
  register: jest.fn(() => Promise.resolve(registration)),
});

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useServiceWorkerRegistration', () => {
  let warn: jest.SpyInstance;
  let unhandledRejections: unknown[];
  const collectRejection = (error: unknown): void => {
    unhandledRejections.push(error);
  };

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    unhandledRejections = [];
    process.on('unhandledRejection', collectRejection);
  });

  afterEach(() => {
    process.off('unhandledRejection', collectRejection);
    warn.mockRestore();
  });

  it('registers the service worker once the component is mounted', async () => {
    const serwist = succeedingServiceWorker();

    renderHook(() => useServiceWorkerRegistration(serwist));

    await waitFor(() => expect(serwist.register).toHaveBeenCalledTimes(1));
  });

  it('does nothing when there is no Serwist instance', () => {
    expect(() =>
      // eslint-disable-next-line unicorn/no-null -- `useSerwist()` yields null when there is no instance.
      renderHook(() => useServiceWorkerRegistration(null)),
    ).not.toThrow();
  });

  it('registers an instance only once, even across remounts', async () => {
    const serwist = succeedingServiceWorker();

    const first = renderHook(() => useServiceWorkerRegistration(serwist));
    await waitFor(() => expect(serwist.register).toHaveBeenCalledTimes(1));
    first.unmount();

    renderHook(() => useServiceWorkerRegistration(serwist));
    await flushMicrotasks();

    expect(serwist.register).toHaveBeenCalledTimes(1);
  });

  // A browser that stubs `navigator.serviceWorker.register()` so that it resolves with
  // nothing makes Serwist throw while reading the registration. That used to reach the
  // user as an unhandled rejection on every page load.
  it('reports a failed registration instead of leaving the rejection unhandled', async () => {
    const failure = new TypeError("Cannot read properties of undefined (reading 'waiting')");
    const serwist: RegistrableServiceWorker = {
      register: jest.fn(() => Promise.reject(failure)),
    };

    renderHook(() => useServiceWorkerRegistration(serwist));

    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.any(String), failure));

    await flushMicrotasks();
    expect(unhandledRejections).toEqual([]);
  });
});
