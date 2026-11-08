/**
 * @jest-environment jsdom
 */

import { OfflineBanner } from '@/components/offline-banner';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { act, render, screen } from '@testing-library/react';

/** A service worker the page can talk to, as on the installed app. */
const installServiceWorker = (): {
  report: (reachable: boolean) => void;
  askedForStatus: jest.Mock;
} => {
  const serviceWorker = new EventTarget();
  const askedForStatus = jest.fn();
  Object.assign(serviceWorker, { controller: { postMessage: askedForStatus } });
  Object.defineProperty(navigator, 'serviceWorker', { value: serviceWorker, configurable: true });
  return {
    report: (reachable: boolean): void => {
      act(() => {
        serviceWorker.dispatchEvent(
          new MessageEvent('message', {
            data: { type: ServiceWorkerMessages.NETWORK_STATUS, payload: { reachable } },
          }),
        );
      });
    },
    askedForStatus,
  };
};

describe('OfflineBanner on wifi without an uplink', () => {
  beforeAll(() => {
    // jsdom has none; the banner uses it to publish its height
    // takes the callback like the real one, so static analysis resolving
    // ResizeObserver to this stub sees the right constructor signature
    globalThis.ResizeObserver = class {
      readonly callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(): void {}
      disconnect(): void {}
      unobserve(): void {}
    };
  });

  // First in this file: the page asks the worker only once per page load.
  it('shows on start when the worker had lost the network before the page loaded', () => {
    const worker = installServiceWorker();
    worker.askedForStatus.mockImplementation(() => worker.report(false));

    render(<OfflineBanner locale="de" />);

    expect(screen.getByRole('status')).toHaveTextContent('Offline – zuletzt geladener Stand');
    worker.report(true);
  });

  it('shows while the service worker gets no answer, although the device reports a network', () => {
    const worker = installServiceWorker();
    render(<OfflineBanner locale="de" />);
    expect(navigator.onLine).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();

    worker.report(false);
    expect(screen.getByRole('status')).toHaveTextContent('Offline – zuletzt geladener Stand');

    worker.report(true);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('goes away by itself once the network answers again, without the app sending a request', () => {
    jest.useFakeTimers();
    const worker = installServiceWorker();
    let reachable = false;
    // the worker answers a page's question with what it finds when it tries the network
    worker.askedForStatus.mockImplementation(() => worker.report(reachable));
    render(<OfflineBanner locale="de" />);
    worker.report(false);
    expect(screen.getByRole('status')).toHaveTextContent('Offline – zuletzt geladener Stand');

    reachable = true;
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.queryByRole('status')).toBeNull();
    jest.useRealTimers();
  });
});
