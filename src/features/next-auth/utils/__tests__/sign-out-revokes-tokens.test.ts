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

type SignOutEvent = (message: { token: JWT | null }) => Promise<void>;
const signOut = authOptions.events?.signOut as unknown as SignOutEvent;

const token = (overrides: Partial<JWT> = {}): JWT => ({
  uuid: '665f1c2ab9d4e80012a3b4c5',
  cevi_db_uuid: 4711,
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  ...overrides,
});

describe('signing out', () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('revokes the refresh token at Cevi.DB, as the client it was issued to', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    await signOut({ token: token() });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://cevi.db.test/oauth/revoke');
    expect(init?.method).toBe('POST');
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      client_id: 'client',
      client_secret: 'secret',
      token: 'refresh-token',
      token_type_hint: 'refresh_token',
    });
  });

  it('asks nothing of Cevi.DB for a session without a refresh token', async () => {
    await signOut({ token: token({ refresh_token: undefined }) });
    // eslint-disable-next-line unicorn/no-null -- Auth.js hands on `null` for a cookie it cannot read
    await signOut({ token: null });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still signs out when Cevi.DB refuses or cannot be reached', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 403 }));
    fetchMock.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    await expect(signOut({ token: token() })).resolves.toBeUndefined();
    await expect(signOut({ token: token() })).resolves.toBeUndefined();
  });
});
