import { onlineStatusStore } from '@/hooks/use-online-status';
import { onlineManager } from '@tanstack/react-query';

/**
 * Queries and mutations follow the same online state as the offline banner, not
 * `navigator.onLine` alone. On wifi without an uplink each tRPC request otherwise waited for the
 * service worker's 10 s timeout and failed; now they hold while the network does not answer,
 * the persisted data stays on screen, and `refetchOnReconnect` runs them once it answers again.
 * Mutations that must not wait (chat, autosave, the emergency alarm) set `networkMode: 'always'`.
 *
 * TanStack starts out online, so the current state is applied right away: an app cold-started
 * offline would otherwise never see a change, and never refetch on reconnect.
 */
export const followOnlineStatus = (): void => {
  onlineManager.setEventListener((setOnline) => {
    setOnline(onlineStatusStore.getSnapshot());
    return onlineStatusStore.subscribe(() => setOnline(onlineStatusStore.getSnapshot()));
  });
};
