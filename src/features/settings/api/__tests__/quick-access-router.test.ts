import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@/lib/prisma/client', () => ({ Prisma: { DbNull: 'DbNull' } }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://app.test' },
}));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): unknown => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn() }),
}));
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

import { quickAccessRouter } from '@/features/settings/api/quick-access-router';

const createCaller = createCallerFactory(quickAccessRouter);

const prisma = {
  user: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
};

const callerAs = (uuid?: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: uuid === undefined ? undefined : { uuid, name: 'Anna Muster' },
    locale: 'de',
    prisma,
  } as unknown as Context);

describe('quickAccessRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.update.mockResolvedValue({});
  });

  it('refuses a visitor who is not logged in', async () => {
    const guest = callerAs();
    await expect(guest.getQuickAccess()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(guest.updateQuickAccess({ tiles: ['map'] })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns no choice for a user who never chose, so the client shows the default', async () => {
    prisma.user.findUnique.mockResolvedValue({ quickAccessTiles: null });
    await expect(callerAs('anna').getQuickAccess()).resolves.toEqual({ tiles: null });

    prisma.user.findUnique.mockResolvedValue(null);
    await expect(callerAs('anna').getQuickAccess()).resolves.toEqual({ tiles: null });
  });

  it('stores the choice of the calling user, without ids this release does not offer', async () => {
    const result = await callerAs('anna').updateQuickAccess({
      tiles: ['map', 'forum', 'map', 'qr'],
    });

    expect(result).toEqual({ tiles: ['map', 'qr'] });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { uuid: 'anna' },
      data: { quickAccessTiles: ['map', 'qr'] },
    });
  });

  it('keeps an empty choice empty', async () => {
    await expect(callerAs('anna').updateQuickAccess({ tiles: [] })).resolves.toEqual({
      tiles: [],
    });
  });

  it('stores the default as no choice, so a new default reaches the user', async () => {
    const result = await callerAs('anna').updateQuickAccess({
      tiles: ['upload', 'qr', 'material', 'support'],
    });

    expect(result).toEqual({ tiles: null });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { uuid: 'anna' },
      data: { quickAccessTiles: 'DbNull' },
    });
  });
});
