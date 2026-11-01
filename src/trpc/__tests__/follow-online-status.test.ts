/**
 * @jest-environment jsdom
 */

import { followOnlineStatus } from '@/trpc/follow-online-status';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import { onlineManager, QueryClient } from '@tanstack/react-query';

/** What the service worker tells the page about the network. */
const installServiceWorker = (): ((reachable: boolean) => void) => {
  const serviceWorker = new EventTarget();
  Object.assign(serviceWorker, { controller: { postMessage: jest.fn() } });
  Object.defineProperty(navigator, 'serviceWorker', { value: serviceWorker, configurable: true });
  return (reachable: boolean): void => {
    serviceWorker.dispatchEvent(
      new MessageEvent('message', {
        data: { type: ServiceWorkerMessages.NETWORK_STATUS, payload: { reachable } },
      }),
    );
  };
};

describe('queries on wifi without an uplink', () => {
  it('hold while the network does not answer and run once it answers again', async () => {
    const report = installServiceWorker();
    followOnlineStatus();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { networkMode: 'online', retry: false } },
    });
    // the provider mounts it in the app, which subscribes it to the online state
    queryClient.mount();
    const loadSchedule = jest.fn(() => Promise.resolve(['Tagesstart']));

    report(false);
    expect(onlineManager.isOnline()).toBe(false);
    const schedule = queryClient.query({ queryKey: ['schedule'], queryFn: loadSchedule });
    await Promise.resolve();
    expect(loadSchedule).not.toHaveBeenCalled();

    report(true);
    await expect(schedule).resolves.toEqual(['Tagesstart']);
    expect(loadSchedule).toHaveBeenCalledTimes(1);
    queryClient.unmount();
  });
});
