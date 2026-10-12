import type { JWT } from 'next-auth/jwt';

// `next-auth` is ESM-only and cannot be imported for a value under Jest.
jest.mock('next-auth', () => ({ customFetch: Symbol('customFetch') }));
jest.mock('next/server', () => ({ after: jest.fn() }));
jest.mock('payload', () => ({ getPayload: jest.fn() }));
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

import { authOptions } from '@/features/next-auth/utils/next-auth-config';

type JwtCallback = (parameters: { token: JWT }) => Promise<JWT | null>;
const jwt = authOptions.callbacks?.jwt as unknown as JwtCallback;

const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;

const expiredToken = (overrides: Partial<JWT> = {}): JWT => ({
  uuid: 'no-refresh-token',
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

    await expect(jwt({ token: expiredToken({ uuid: 'refused' }) })).resolves.toBeNull();
  });

  it('ends when it has no refresh token left to learn its groups with', async () => {
    await expect(jwt({ token: expiredToken({ refresh_token: undefined }) })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('survives Cevi.DB being unavailable and tries again on the next request', async () => {
    fetchMock.mockResolvedValue(answer(503, { error: 'unavailable' }));
    const token = expiredToken({ uuid: 'unavailable' });

    await expect(jwt({ token })).resolves.toEqual(token);
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

    const refreshed = await jwt({ token: expiredToken({ uuid: 'refreshed' }) });

    expect(refreshed?.group_ids).toEqual([99]);
    expect(refreshed?.access_token).toBe('new-access-token');
  });
});
