import {
  findReplayableRoutePattern,
  findReplayableSiblingKey,
  getCleanAppPath,
  OFFLINE_CHAT_SHELL_ID,
  sanitizeRscResponse,
} from '@/features/service-worker/offline-support/rsc-utils';

const CHAT_A = '26701af7-d70b-416e-8679-0e74dae93a53';
const CHAT_B = 'b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const cacheKeys = (...paths: string[]): Request[] =>
  paths.map((path) => ({ url: `https://conveniat27.cevi.tools${path}` }) as Request);

describe('Service Worker Clean Path & RSC Utilities', () => {
  test('getCleanAppPath correctly strips locale and design prefixes', () => {
    expect(
      getCleanAppPath('/de/default/app/schedule/6952e094dadf4f28c0c5c7ee?date=2027-07-26'),
    ).toBe('/app/schedule/6952e094dadf4f28c0c5c7ee?date=2027-07-26');
    expect(getCleanAppPath('/en/web/app/emergency')).toBe('/app/emergency');
    expect(getCleanAppPath('/fr/app/helper-portal')).toBe('/app/helper-portal');
    expect(getCleanAppPath('/app/dashboard')).toBe('/app/dashboard');
  });

  describe('findReplayableRoutePattern', () => {
    test('recognises the client rendered chat routes', () => {
      expect(findReplayableRoutePattern(`/app/chat/${CHAT_A}`)).toBe('/app/chat/:uuid');
      expect(findReplayableRoutePattern(`/app/chat/${CHAT_A}/details`)).toBe(
        '/app/chat/:uuid/details',
      );
    });

    test('does not treat static chat siblings as a chat id', () => {
      expect(findReplayableRoutePattern('/app/chat/new')).toBeUndefined();
      expect(findReplayableRoutePattern('/app/chat/new-chat-with-user')).toBeUndefined();
      expect(findReplayableRoutePattern('/app/chat')).toBeUndefined();
    });

    test('does not leak into other app sections', () => {
      expect(findReplayableRoutePattern(`/app/schedule/${CHAT_A}`)).toBeUndefined();
      expect(findReplayableRoutePattern(`/app/chat/${CHAT_A}/details/extra`)).toBeUndefined();
    });
  });

  describe('findReplayableSiblingKey', () => {
    test('replays a details payload cached for another chat', () => {
      const keys = cacheKeys('/app/chat', `/app/chat/${CHAT_B}/details`);
      expect(findReplayableSiblingKey(keys, `/app/chat/${CHAT_A}/details`)?.url).toBe(
        `https://conveniat27.cevi.tools/app/chat/${CHAT_B}/details`,
      );
    });

    test('replays the prefetched offline shell', () => {
      const keys = cacheKeys(`/app/chat/${OFFLINE_CHAT_SHELL_ID}/details`);
      expect(findReplayableSiblingKey(keys, `/app/chat/${CHAT_A}/details`)?.url).toContain(
        OFFLINE_CHAT_SHELL_ID,
      );
    });

    test('never crosses between the chat view and the chat details route', () => {
      const keys = cacheKeys(`/app/chat/${CHAT_B}`);
      expect(findReplayableSiblingKey(keys, `/app/chat/${CHAT_A}/details`)).toBeUndefined();

      const detailKeys = cacheKeys(`/app/chat/${CHAT_B}/details`);
      expect(findReplayableSiblingKey(detailKeys, `/app/chat/${CHAT_A}`)).toBeUndefined();
    });

    test('ignores locale and design prefixes on cached keys', () => {
      const keys = cacheKeys(`/de/default/app/chat/${CHAT_B}/details`);
      expect(findReplayableSiblingKey(keys, `/app/chat/${CHAT_A}/details`)?.url).toContain(CHAT_B);
    });

    test('returns nothing when only the chat overview is cached', () => {
      const keys = cacheKeys('/app/chat', '/app/dashboard');
      expect(findReplayableSiblingKey(keys, `/app/chat/${CHAT_A}/details`)).toBeUndefined();
    });
  });

  describe('sanitizeRscResponse', () => {
    test('strips Vary from a cached payload without touching the body or status', async () => {
      const cached = new Response('flight-payload', {
        status: 200,
        headers: { Vary: 'RSC, Next-Router-State-Tree', 'content-type': 'text/x-component' },
      });

      const sanitized = sanitizeRscResponse(cached);

      expect(sanitized.headers.get('Vary')).toBeNull();
      expect(sanitized.headers.get('content-type')).toBe('text/x-component');
      expect(sanitized.status).toBe(200);
      await expect(sanitized.text()).resolves.toBe('flight-payload');
    });

    test('returns the very same response when there is no Vary header to strip', () => {
      const cached = new Response('flight-payload');
      expect(sanitizeRscResponse(cached)).toBe(cached);
    });

    /**
     * `matchCachedRsc` answers a request with a payload rendered for a *different* URL
     * (parent shell, replayable sibling, clean-path match). Re-labelling such a payload with
     * the requested pathname/query would tell Next.js that stale route data matches the
     * requested state, so the rewrite headers must be passed through verbatim.
     */
    test('never rewrites the route headers a replayed payload was rendered with', () => {
      const shell = new Response('flight-payload', {
        headers: {
          Vary: 'RSC',
          'x-nextjs-rewritten-path': '/de/design-mode-app/app/schedule',
          'x-nextjs-rewritten-query': '',
        },
      });

      const sanitized = sanitizeRscResponse(shell);

      expect(sanitized.headers.get('x-nextjs-rewritten-path')).toBe(
        '/de/design-mode-app/app/schedule',
      );
      expect(sanitized.headers.get('x-nextjs-rewritten-query')).toBe('');
    });

    test('does not invent route headers for a payload that carries none', () => {
      const sanitized = sanitizeRscResponse(
        new Response('flight-payload', { headers: { Vary: 'RSC' } }),
      );

      expect(sanitized.headers.get('x-nextjs-rewritten-path')).toBeNull();
      expect(sanitized.headers.get('x-nextjs-rewritten-query')).toBeNull();
    });
  });
});
