const mockNextAuthAuth = jest.fn<Promise<unknown>, unknown[]>();
jest.mock('next-auth', () => ({
  __esModule: true,
  default: (): Record<string, unknown> => ({
    auth: (...arguments_: unknown[]): Promise<unknown> => mockNextAuthAuth(...arguments_),
    handlers: {},
    signOut: jest.fn(),
  }),
}));
jest.mock('@/features/next-auth/utils/next-auth-config', () => ({ authOptions: {} }));

let mockCookieNames: string[] = [];
jest.mock('next/headers', () => ({
  cookies: (): Promise<{ getAll: () => { name: string }[] }> =>
    Promise.resolve({ getAll: () => mockCookieNames.map((name) => ({ name })) }),
}));

import { auth } from '@/utils/auth';

const session = { user: { name: 'Anna Muster' }, expires: '2027-07-24T00:00:00.000Z' };

describe('auth', () => {
  beforeEach(() => {
    mockNextAuthAuth.mockReset().mockResolvedValue(session);
  });

  it('answers a request without a session cookie with null, without asking Auth.js', async () => {
    // A bot or a first visit: no session, and no CSRF cookie either, which Auth.js would mint.
    mockCookieNames = ['NEXT_LOCALE'];

    await expect(auth()).resolves.toBeNull();
    expect(mockNextAuthAuth).not.toHaveBeenCalled();
  });

  it.each([
    'authjs.session-token',
    '__Secure-authjs.session-token',
    '__Secure-authjs.session-token.0',
  ])('asks Auth.js for the session when %s is sent', async (cookieName) => {
    mockCookieNames = ['authjs.csrf-token', cookieName];

    await expect(auth()).resolves.toBe(session);
  });

  it('passes the middleware form to Auth.js unchanged', async () => {
    mockCookieNames = [];
    const request = new Request('https://conveniat27.ch/app');
    const event = { waitUntil: jest.fn() };

    await (auth as unknown as (...arguments_: unknown[]) => Promise<unknown>)(request, event);

    expect(mockNextAuthAuth).toHaveBeenCalledWith(request, event);
  });
});
