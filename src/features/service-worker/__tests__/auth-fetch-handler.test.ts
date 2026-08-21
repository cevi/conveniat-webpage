/**
 * @jest-environment node
 */

import { handleFetchEvent } from '@/features/service-worker/offline-support/fetch-handler';
import type { Serwist } from 'serwist';

// `map-viewer` reads `self.location` at import time and pulls in serwist's ESM build, neither of
// which exists under jest. Nothing on the auth path touches it.
jest.mock('@/features/service-worker/offline-support/map-viewer', () => ({
  normalizeTileUrl: (url: string): string => url,
}));

const csrfEvent = (): { event: FetchEvent; responded: () => Promise<Response> } => {
  let responded: Promise<Response> | undefined;

  const event = {
    request: {
      url: 'https://konekta.ch/api/auth/csrf',
      mode: 'cors',
      headers: { get: (): null => null }, // eslint-disable-line unicorn/no-null
    },
    respondWith: (response: Promise<Response>): void => {
      responded = response;
    },
    waitUntil: (): void => {},
  } as unknown as FetchEvent;

  return {
    event,
    responded: async (): Promise<Response> => {
      if (responded === undefined) throw new Error('the handler never answered the request');
      return responded;
    },
  };
};

describe('the service worker and /api/auth/csrf', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    jest.restoreAllMocks();
  });

  /**
   * #1622-follow-up: the handler used to answer an unreachable network with a made-up
   * `offline-csrf-token`. next-auth posted it to `/api/auth/signout`, where it can never match
   * the CSRF cookie, so the server logged `MissingCSRF` and kept the session alive while the
   * client had already flushed its data and redirected.
   */
  it('reports a network failure instead of inventing a token', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as typeof fetch;
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { event, responded } = csrfEvent();
    handleFetchEvent({} as Serwist)(event);
    const response = await responded();

    expect(response.type).toBe('error');
  });

  it('passes a reachable request through untouched', async () => {
    const networkResponse = new Response(JSON.stringify({ csrfToken: 'a-real-token' }), {
      status: 200,
    });
    globalThis.fetch = jest.fn().mockResolvedValue(networkResponse) as typeof fetch;

    const { event, responded } = csrfEvent();
    handleFetchEvent({} as Serwist)(event);

    expect(await responded()).toBe(networkResponse);
  });
});
