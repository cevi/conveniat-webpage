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

type JwtCallback = (parameters: { token: JWT; trigger?: 'update' }) => Promise<JWT | null>;
const jwt = authOptions.callbacks?.jwt as unknown as JwtCallback;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

/** A session an hour into its two-hour access token, last synced when it was issued. */
const validToken = (overrides: Partial<JWT> = {}): JWT => ({
  uuid: '665f1c2ab9d4e80012a3b4c5',
  cevi_db_uuid: 4711,
  group_ids: [541],
  groups_synced_at: nowSeconds() - 3600,
  access_token: 'access-token',
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

describe('a user asking for their current Cevi.DB groups', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

  const ceviDatabaseReportsGroups = (groupIds: number[]): void => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        url.endsWith('/oauth/token')
          ? answer(200, { access_token: 'new-access-token', expires_in: 7200 })
          : answer(200, {
              first_name: 'Mia',
              last_name: 'Muster',
              roles: groupIds.map((group_id) => ({ group_id })),
            }),
      ),
    );
  };

  // A finished refresh stays shared between concurrent requests for a second, on a timer.
  beforeAll(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] }));
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('gets them although the access token is still valid', async () => {
    ceviDatabaseReportsGroups([541, 542]);

    const synced = await jwt({
      token: validToken({ refresh_token: 'requested' }),
      trigger: 'update',
    });

    expect(synced?.group_ids).toEqual([541, 542]);
    expect(synced?.groups_synced_at).toBeGreaterThanOrEqual(nowSeconds() - 1);
  });

  it('is not answered with a call to Cevi.DB on an ordinary request', async () => {
    const token = validToken();

    await expect(jwt({ token })).resolves.toBe(token);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps what it has when it was synced less than a minute ago', async () => {
    const token = validToken({ groups_synced_at: nowSeconds() - 30 });

    await expect(jwt({ token, trigger: 'update' })).resolves.toBe(token);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the session and its sync time while Cevi.DB is unavailable', async () => {
    fetchMock.mockResolvedValue(answer(503, { error: 'unavailable' }));
    const token = validToken({ refresh_token: 'unavailable' });

    await expect(jwt({ token, trigger: 'update' })).resolves.toEqual(token);
  });
});
