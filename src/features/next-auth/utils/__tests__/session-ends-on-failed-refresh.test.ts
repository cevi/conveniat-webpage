import type { JWT } from 'next-auth/jwt';

// `next-auth` is ESM-only and cannot be imported for a value under Jest.
jest.mock('next-auth', () => ({ customFetch: Symbol('customFetch') }));
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('undici', () => ({ Agent: jest.fn(), setGlobalDispatcher: jest.fn() }));
// Without Redis every refresh runs in this process, which is what these tests look at.
jest.mock('@/lib/db/redis', () => ({
  redis: { get: (): Promise<never> => Promise.reject(new Error('Redis is not part of this test')) },
}));
jest.mock('@/utils/server-logger', () => {
  const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { createLogger: (): Record<string, jest.Mock> => logger, logger };
});
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    HITOBITO_BASE_URL: 'https://cevi.db.test',
    HITOBITO_FORWARD_URL: 'https://cevi.db.test',
    CEVI_DB_CLIENT_ID: 'client',
    CEVI_DB_CLIENT_SECRET: 'secret',
  },
}));

import { authOptions } from '@/features/next-auth/utils/next-auth-config';

const { logger: mockLogger } = jest.requireMock<{ logger: { error: jest.Mock } }>(
  '@/utils/server-logger',
);

type JwtCallback = (parameters: { token: JWT }) => Promise<JWT | null>;
const jwt = authOptions.callbacks?.jwt as unknown as JwtCallback;

const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

const expiredToken = (overrides: Partial<JWT> = {}): JWT => ({
  uuid: '665f1c2ab9d4e80012a3b4c5',
  cevi_db_uuid: 4711,
  group_ids: [541],
  access_token: 'expired-access-token',
  refresh_token: 'refresh-token',
  expires_at: oneHourAgo,
  ...overrides,
});

const answer = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('a session whose access token has expired', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

  // A finished refresh stays shared between concurrent requests for a second, on a timer.
  beforeAll(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] }));
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('ends when Cevi.DB refuses the refresh token', async () => {
    fetchMock.mockResolvedValue(answer(400, { error: 'invalid_grant' }));

    await expect(jwt({ token: expiredToken({ refresh_token: 'refused' }) })).resolves.toBeNull();
  });

  it('says which session was refused and how old its refresh token was', async () => {
    fetchMock.mockResolvedValue(answer(400, { error: 'invalid_grant' }));
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 3600;

    await jwt({
      token: expiredToken({
        refresh_token: 'used-up',
        session_id: 'session-of-the-phone',
        refreshed_at: twoDaysAgo,
      }),
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error refreshing access token',
      expect.objectContaining({
        'auth.session_id': 'session-of-the-phone',
        'auth.refresh_token_age_seconds': 2 * 24 * 3600,
      }),
    );
  });

  it('ends when it has no refresh token left to learn its groups with', async () => {
    await expect(jwt({ token: expiredToken({ refresh_token: undefined }) })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([503, 408, 429])(
    'survives Cevi.DB answering %i and asks again on a later request',
    async (status) => {
      fetchMock.mockResolvedValue(answer(status, { error: 'try again later' }));
      const token = expiredToken({ refresh_token: `retryable-${status}` });

      await expect(jwt({ token })).resolves.toEqual(token);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      await expect(jwt({ token })).resolves.toEqual(token);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('keeps the session of a second device when the first one is refused', async () => {
    fetchMock.mockImplementation((url, init) => {
      const body = init?.body;
      const refused =
        body instanceof URLSearchParams && body.get('refresh_token') === 'first-device';
      if (refused) return Promise.resolve(answer(400, { error: 'invalid_grant' }));
      return Promise.resolve(
        url.endsWith('/oauth/token')
          ? answer(200, { access_token: 'new-access-token', expires_in: 7200 })
          : answer(200, { first_name: 'Mia', last_name: 'Muster', roles: [{ group_id: 541 }] }),
      );
    });

    const [first, second] = await Promise.all([
      jwt({ token: expiredToken({ refresh_token: 'first-device' }) }),
      jwt({ token: expiredToken({ refresh_token: 'second-device' }) }),
    ]);

    expect(first).toBeNull();
    expect(second?.access_token).toBe('new-access-token');
  });

  it('takes the groups Cevi.DB reports once the refresh succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, { access_token: 'new-access-token', expires_in: 7200 }))
      .mockResolvedValueOnce(
        answer(200, {
          email: 'pfote@example.org',
          first_name: 'Mia',
          last_name: 'Muster',
          nickname: 'Pfote',
          roles: [{ group_id: 99 }],
        }),
      );

    const refreshed = await jwt({ token: expiredToken({ refresh_token: 'refreshed' }) });

    expect(refreshed?.group_ids).toEqual([99]);
    expect(refreshed?.access_token).toBe('new-access-token');
  });

  it('keeps its session id and starts the age of the new refresh token at the refresh', async () => {
    fetchMock
      .mockResolvedValueOnce(
        answer(200, {
          access_token: 'new-access-token',
          refresh_token: 'rotated-refresh-token',
          expires_in: 7200,
        }),
      )
      .mockResolvedValueOnce(answer(200, { first_name: 'Mia', last_name: 'Muster', roles: [] }));

    const refreshed = await jwt({
      token: expiredToken({
        refresh_token: 'kept-session',
        session_id: 'session-of-the-phone',
        refreshed_at: oneHourAgo - 3600,
      }),
    });

    expect(refreshed?.session_id).toBe('session-of-the-phone');
    expect(refreshed?.refreshed_at).toBe(Math.floor(Date.now() / 1000));
  });

  it('gets a session id at its first refresh when it was issued without one', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(200, { access_token: 'new-access-token', expires_in: 7200 }))
      .mockResolvedValueOnce(answer(200, { first_name: 'Mia', last_name: 'Muster', roles: [] }));

    const refreshed = await jwt({ token: expiredToken({ refresh_token: 'older-session' }) });

    expect(refreshed?.session_id).toEqual(expect.any(String));
  });
});
