import { hasAccessToThisUser } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { isUserBlocked } from '@/lib/user-blocking/is-user-blocked';
import type { Context } from '@/trpc/init';
import {
  createCallerFactory,
  createTRPCRouter,
  trpcAdminProcedure,
  trpcBaseProcedure,
} from '@/trpc/init';
import { TRPCError } from '@trpc/server';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {},
}));

jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (data: unknown): unknown => data,
    deserialize: (data: unknown): unknown => data,
  },
}));

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/utils/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/utils/auth-helpers', () => ({
  isValidNextAuthUser: jest.fn().mockReturnValue(true),
}));

jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));

jest.mock('@/lib/user-blocking/is-user-blocked', () => ({
  isUserBlocked: jest.fn(),
}));

jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  Roles: {
    FullAdmin: 'FullAdmin',
    WebCoreTeam: 'WebCoreTeam',
  },
  hasAccessToThisUser: jest.fn().mockReturnValue(true),
}));

const mockIsUserBlocked = isUserBlocked as unknown as jest.Mock;
const mockHasAccessToThisUser = hasAccessToThisUser as unknown as jest.Mock;

const router = createTRPCRouter({
  protected: trpcBaseProcedure.query(() => 'ok'),
  adminOnly: trpcAdminProcedure.query(() => 'ok'),
});

const buildContext = (user: Context['user']): Context =>
  ({
    user,
    locale: 'de',
    prisma: {},
  }) as unknown as Context;

const sessionUser = {
  uuid: 'user-uuid-123',
  group_ids: [],
  email: 'someone@example.com',
  name: 'Some One',
} as unknown as NonNullable<Context['user']>;

describe('tRPC authentication middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsUserBlocked.mockResolvedValue(false);
    mockHasAccessToThisUser.mockReturnValue(true);
  });

  it('rejects unauthenticated callers', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const caller = createCallerFactory(router)(buildContext(undefined));
    await expect(caller.protected()).rejects.toThrow(TRPCError);
    expect(mockIsUserBlocked).not.toHaveBeenCalled();
  });

  it('allows authenticated callers that are not blocked', async () => {
    const caller = createCallerFactory(router)(buildContext(sessionUser));
    await expect(caller.protected()).resolves.toBe('ok');
    expect(mockIsUserBlocked).toHaveBeenCalledWith('user-uuid-123');
  });

  it('rejects blocked users on protected procedures', async () => {
    mockIsUserBlocked.mockResolvedValue(true);
    const caller = createCallerFactory(router)(buildContext(sessionUser));

    await expect(caller.protected()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'USER_BLOCKED',
    });
  });

  it('rejects blocked users on admin procedures before checking their roles', async () => {
    mockIsUserBlocked.mockResolvedValue(true);
    const caller = createCallerFactory(router)(buildContext(sessionUser));

    await expect(caller.adminOnly()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'USER_BLOCKED',
    });
    expect(mockHasAccessToThisUser).not.toHaveBeenCalled();
  });

  it('allows admins that are not blocked', async () => {
    const caller = createCallerFactory(router)(buildContext(sessionUser));
    await expect(caller.adminOnly()).resolves.toBe('ok');
  });
});
