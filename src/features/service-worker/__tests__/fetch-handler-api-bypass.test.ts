import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

// The map module reads the worker's `self.location` on load; no request below is a map tile.
jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: jest.fn(),
}));

const ORIGIN = 'https://conveniat27.ch';

interface FakeFetchEvent {
  request: Request;
  clientId: string;
  resultingClientId: string;
  respondWith: jest.Mock;
  waitUntil: jest.Mock;
}

const dispatch = (path: string, init?: RequestInit): FakeFetchEvent => {
  const event: FakeFetchEvent = {
    request: new Request(`${ORIGIN}${path}`, init),
    clientId: '',
    resultingClientId: '',
    respondWith: jest.fn(),
    waitUntil: jest.fn(),
  };
  handleFetchEvent({} as Serwist)(event as unknown as FetchEvent);
  return event;
};

describe('service worker API routing', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue(new Response('{}'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // Firefox terminates the worker 30 s after its last event and cuts any body it is still
  // relaying, so long-lived API responses must reach the page without the worker in between.
  test.each([
    ['the NDJSON Hof walk', '/api/confidential/billing/populate-subevents', 'POST'],
    ['the chat event stream', '/api/chat/sse', 'GET'],
    ['a Hof files zip download', '/api/hof-dashboard/000000000000000000000001/files', 'GET'],
    ['a Payload REST call from the admin panel', '/api/form-submissions', 'POST'],
    // Next.js redirects it to /api/users; answering it would cache that response.
    ['an API path with repeated slashes', '//api/users', 'GET'],
  ])('leaves %s to the browser', (_label, path, method) => {
    expect(dispatch(path, { method }).respondWith).not.toHaveBeenCalled();
  });

  test.each([
    ['tRPC, which falls back to the persisted query cache', '/api/trpc/getChatList'],
    ['auth, which keeps a session offline', '/api/auth/providers'],
  ])('still answers %s', (_label, path) => {
    expect(dispatch(path).respondWith).toHaveBeenCalledTimes(1);
  });
});
