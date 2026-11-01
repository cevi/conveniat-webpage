import { CACHE_NAMES } from '@/features/service-worker/constants';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

declare const self: ServiceWorkerGlobalScope;

/**
 * Key in the `OFFLINE_STATUS` cache that is present while the network does not answer.
 * Absolute for the reason given at `OFFLINE_ENABLED_FLAG`.
 */
const UNREACHABLE_FLAG = '/network-unreachable';

/**
 * Whether the last request that went to the network got no answer.
 *
 * Wifi without a working uplink, the usual case at camp, leaves `navigator.onLine` true and every
 * request open until it times out. Each request used to find that out on its own, so a cold start
 * paid the full wait once per document, session and RSC request, 12 s in all. Once one request has
 * gone unanswered, the following ones wait only briefly before the cache answers; their network
 * requests keep running, and the first answer from the network ends this state.
 *
 * Kept in the cache as well, since the browser stops an idle worker: a cold start on the same
 * dead wifi then waits briefly for its first document too, not the full timeout.
 */
let unreachable: boolean | undefined;
let loading: Promise<boolean> | undefined;

async function readPersisted(): Promise<boolean> {
  try {
    const cache = await caches.open(CACHE_NAMES.OFFLINE_STATUS);
    return (await cache.match(UNREACHABLE_FLAG)) !== undefined;
  } catch {
    return false;
  }
}

async function persist(value: boolean): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAMES.OFFLINE_STATUS);
    await (value ? cache.put(UNREACHABLE_FLAG, new Response('')) : cache.delete(UNREACHABLE_FLAG));
  } catch (error) {
    console.warn('[SW] Could not store the network state:', error);
  }
}

async function broadcast(value: boolean): Promise<void> {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({
        type: ServiceWorkerMessages.NETWORK_STATUS,
        payload: { reachable: !value },
      });
    }
  } catch (error) {
    console.warn('[SW] Could not report the network state to the pages:', error);
  }
}

/** Whether the network has stopped answering, see {@link unreachable}. */
export async function isNetworkUnreachable(): Promise<boolean> {
  if (unreachable !== undefined) return unreachable;
  loading ??= readPersisted();
  const persisted = await loading;
  // a request may have settled the state while the cache was read
  unreachable ??= persisted;
  return unreachable;
}

async function setUnreachable(value: boolean): Promise<void> {
  const previous = await isNetworkUnreachable();
  unreachable = value;
  if (previous === value) return;
  console.log(`[SW] Network ${value ? 'stopped answering' : 'answers again'}`);
  await Promise.all([persist(value), broadcast(value)]);
}

/** When the network last answered; see `markNetworkUnreachable`. */
let lastAnswerAt = 0;

/**
 * Records that a request got no answer in time, or failed without one. A request that went out
 * before the network's last answer does not count: it failed on a connection from the outage,
 * which a phone resets when its wifi comes back, after the network has already answered again.
 */
export function markNetworkUnreachable(requestStartedAt: number = Date.now()): Promise<void> {
  if (requestStartedAt < lastAnswerAt) return Promise.resolve();
  return setUnreachable(true);
}

/** Records that the network answered, whatever the status. */
export function markNetworkReachable(): Promise<void> {
  lastAnswerAt = Date.now();
  return setUnreachable(false);
}

/** How long the probe below waits for `/status`. */
const PROBE_TIMEOUT_MS = 3000;
let probing: Promise<void> | undefined;

/**
 * Asks the network once whether it answers again. Without it, the state ends only with the next
 * request the app happens to send, and a page showing cached data may send none for minutes.
 */
function probeNetwork(): Promise<void> {
  probing ??= (async (): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      await fetch('/status', { cache: 'no-store', signal: controller.signal });
      await markNetworkReachable();
    } catch {
      // still no answer
    } finally {
      clearTimeout(timeoutId);
      probing = undefined;
    }
  })();
  return probing;
}

/**
 * Answers a page that asks for the state: one that just started and missed the earlier
 * broadcasts, or one that shows the offline banner and asks again from time to time. The answer
 * goes out first, so a page starting on a dead network shows the banner at once; then the
 * network is tried, and if it answers, every page hears so through the broadcast.
 */
export async function reportNetworkStatus(client: Client): Promise<void> {
  const isUnreachable = await isNetworkUnreachable();
  client.postMessage({
    type: ServiceWorkerMessages.NETWORK_STATUS,
    payload: { reachable: !isUnreachable },
  });
  if (isUnreachable && navigator.onLine) await probeNetwork();
}
