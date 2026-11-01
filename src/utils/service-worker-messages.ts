export const ServiceWorkerMessages = {
  START_OFFLINE_DOWNLOAD: 'START_OFFLINE_DOWNLOAD',
  OFFLINE_DOWNLOAD_PROGRESS: 'OFFLINE_DOWNLOAD_PROGRESS',
  OFFLINE_DOWNLOAD_COMPLETE: 'OFFLINE_DOWNLOAD_COMPLETE',
  CHECK_OFFLINE_READY: 'CHECK_OFFLINE_READY',
  CAPTURE_POSTHOG_EVENT: 'CAPTURE_POSTHOG_EVENT',
  PUSH_NAVIGATE: 'PUSH_NAVIGATE',
  GET_CLIENT_URL: 'GET_CLIENT_URL',
  CACHE_DYNAMIC_ROUTES: 'CACHE_DYNAMIC_ROUTES',
  CLEAR_PERSONAL_CACHES: 'CLEAR_PERSONAL_CACHES',
  /** Worker to page: `{ reachable }`. Page to worker: a request for the current state. */
  NETWORK_STATUS: 'NETWORK_STATUS',
} as const;

/**
 * Set on a session answer the service worker made up rather than got from the network: the
 * cached session, or `null` when there is none. Whoever needs the server's verdict, like the
 * background session check, ignores such an answer and asks again once the network answers.
 */
export const ANSWERED_BY_SERVICE_WORKER_HEADER = 'X-Answered-By-Service-Worker';
