jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
  },
}));
jest.mock('@/utils/auth-helpers', () => ({ getAuthenticateUsingCeviDB: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/features/payload-cms/payload-cms/utils/hof-membership', () => ({
  findRegisteredHoefe: jest.fn(),
  toHofIds: jest.fn(() => []),
}));
jest.mock('@/features/payload-cms/payload-cms/utils/funktionen', () => ({
  findFunktionIdsOfPerson: jest.fn(),
  toFunktionIds: jest.fn(() => []),
}));

import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import { findFunktionIdsOfPerson } from '@/features/payload-cms/payload-cms/utils/funktionen';
import { findRegisteredHoefe } from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload';

const hoefeOf = jest.mocked(findRegisteredHoefe);
const funktionenOf = jest.mocked(findFunktionIdsOfPerson);
const logger = { error: jest.fn() };
const request = { payload: { logger } } as unknown as PayloadRequest;

/** Runs the collection's beforeChange hooks on a first login with the given Cevi.DB id. */
const firstLogin = async (ceviId: number): Promise<Record<string, unknown>> => {
  let data: Record<string, unknown> = { cevi_db_uuid: ceviId, fullName: 'Anna Muster' };
  for (const hook of (UserCollection.hooks?.beforeChange ?? []) as CollectionBeforeChangeHook[]) {
    data = (await hook({
      data,
      req: request,
      operation: 'create',
      collection: UserCollection,
      context: {},
    } as unknown as Parameters<CollectionBeforeChangeHook>[0])) as Record<string, unknown>;
  }
  return data;
};

describe('a user logging in for the first time', () => {
  beforeEach(() => jest.clearAllMocks());

  it('gets their Höfe and functions', async () => {
    hoefeOf.mockResolvedValue({ hoefe: ['hof-sued'], avpHoefe: ['hof-sued'] });
    funktionenOf.mockResolvedValue(['projektleitung']);

    await expect(firstLogin(7)).resolves.toMatchObject({
      hoefe: ['hof-sued'],
      avpHoefe: ['hof-sued'],
      funktionen: ['projektleitung'],
    });
  });

  it('still logs in when the lookup fails, and the failure is logged', async () => {
    hoefeOf.mockResolvedValue({ hoefe: [], avpHoefe: [] });
    funktionenOf.mockRejectedValue(new Error('mongo down'));

    const data = await firstLogin(7);

    expect(data).toMatchObject({ cevi_db_uuid: 7, fullName: 'Anna Muster' });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
