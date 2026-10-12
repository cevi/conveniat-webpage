import type { JWT } from 'next-auth/jwt';
import type { NextFetchEvent } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

// `next-auth` is ESM-only and cannot be imported for a value under Jest.
jest.mock('next-auth', () => ({ customFetch: Symbol('customFetch') }));
jest.mock('payload', () => ({ getPayload: jest.fn().mockRejectedValue(new Error('no database')) }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('undici', () => ({ Agent: jest.fn(), setGlobalDispatcher: jest.fn() }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    HITOBITO_BASE_URL: 'https://cevi.db.test',
    HITOBITO_FORWARD_URL: 'https://cevi.db.test',
    CEVI_DB_CLIENT_ID: 'client',
    CEVI_DB_CLIENT_SECRET: 'secret',
  },
}));

const SESSION_COOKIE = 'authjs.session-token';

// Stands in for Auth.js, which runs the `jwt` callback and then sets the session cookie whatever
// came out of it: re-signed for a token, emptied for none.
let sessionToken: JWT | undefined;
jest.mock('@/utils/auth', () => ({
  auth: async (): Promise<Response> => {
    const { authOptions } = await import('@/features/next-auth/utils/next-auth-config');
    const jwt = authOptions.callbacks?.jwt as unknown as (parameters: {
      token: JWT;
    }) => Promise<JWT | null>;
    const headers = new Headers();
    if (sessionToken !== undefined) {
      const resolved = await jwt({ token: sessionToken });
      headers.append(
        'set-cookie',
        resolved === null
          ? `${SESSION_COOKIE}=; Max-Age=0; Path=/`
          : `${SESSION_COOKIE}=signed-${resolved.access_token}; Path=/; HttpOnly`,
      );
    }
    return new Response(undefined, { headers });
  },
}));

import { withoutUnchangedSessionCookie } from '@/features/next-auth/utils/session-token-change';
import { rotateSessionToken } from '@/proxy/utils/rotate-session-token';

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const session = (overrides: Partial<JWT> = {}): JWT => ({
  uuid: '665f1c2ab9d4e80012a3b4c5',
  cevi_db_uuid: 4711,
  group_ids: [541],
  access_token: 'current',
  refresh_token: 'refresh-token',
  expires_at: nowSeconds() + 3600,
  ...overrides,
});

const answer = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  }) as unknown as Response;

/** The session cookies the proxy puts on the response of a request carrying this session. */
const cookiesSetFor = async (token: JWT | undefined): Promise<string[]> => {
  sessionToken = token;
  const response = NextResponse.next();
  await rotateSessionToken(
    new NextRequest('https://conveniat27.test/app/settings'),
    {} as NextFetchEvent,
    response,
  );
  return response.headers.getSetCookie();
};

describe('the session cookie on a response', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

  // A finished refresh stays shared between concurrent requests for a second, on a timer.
  beforeAll(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] }));
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('is left out while the session is valid, so it cannot overwrite a newer one', async () => {
    await expect(cookiesSetFor(session())).resolves.toEqual([]);
  });

  it('carries the new tokens after a refresh', async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        url.endsWith('/oauth/token')
          ? answer(200, { access_token: 'rotated', expires_in: 7200 })
          : answer(200, { id: 4711, first_name: 'Mia', last_name: 'Muster', roles: [] }),
      ),
    );

    const cookies = await cookiesSetFor(
      session({ refresh_token: 'refreshes', expires_at: nowSeconds() - 60 }),
    );

    expect(cookies).toEqual([`${SESSION_COOKIE}=signed-rotated; Path=/; HttpOnly`]);
  });

  it('is left out when Cevi.DB cannot be reached and the session goes on as it is', async () => {
    fetchMock.mockResolvedValue(answer(503, { error: 'unavailable' }));

    const cookies = await cookiesSetFor(
      session({ refresh_token: 'unavailable', expires_at: nowSeconds() - 60 }),
    );

    expect(cookies).toEqual([]);
  });

  it('is cleared when Cevi.DB refuses the refresh token', async () => {
    fetchMock.mockResolvedValue(answer(400, { error: 'invalid_grant' }));

    const cookies = await cookiesSetFor(
      session({ refresh_token: 'refused', expires_at: nowSeconds() - 60 }),
    );

    expect(cookies).toEqual([`${SESSION_COOKIE}=; Max-Age=0; Path=/`]);
  });
});

const respondWith = (cookies: string[]): (() => Promise<Response>) => {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return () => Promise.resolve(new Response('{"user":{}}', { status: 200, headers }));
};

describe('an Auth.js route handler', () => {
  it('answers a session check without the session cookie, in one piece or in chunks', async () => {
    const { reportSessionTokenKept } =
      await import('@/features/next-auth/utils/session-token-change');
    const cookies = [
      `__Secure-${SESSION_COOKIE}.0=first-half; Path=/`,
      `__Secure-${SESSION_COOKIE}.1=second-half; Path=/`,
      '__Host-authjs.csrf-token=csrf; Path=/',
    ];
    const handler = withoutUnchangedSessionCookie(async () => {
      reportSessionTokenKept();
      return respondWith(cookies)();
    });

    const response = await handler();

    expect(response.headers.getSetCookie()).toEqual(['__Host-authjs.csrf-token=csrf; Path=/']);
    await expect(response.json()).resolves.toEqual({ user: {} });
  });

  it('passes every cookie on when the session was not merely checked, as on sign-out', async () => {
    const cookies = [`${SESSION_COOKIE}=; Max-Age=0; Path=/`, 'authjs.callback-url=x; Path=/'];
    const handler = withoutUnchangedSessionCookie(respondWith(cookies));

    const response = await handler();

    expect(response.headers.getSetCookie()).toEqual(cookies);
  });
});
