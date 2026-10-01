jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
  },
}));
jest.mock('@/utils/auth-helpers', () => ({ getAuthenticateUsingCeviDB: jest.fn() }));
const mockFindUnique = jest.fn();
const mockTransaction = jest.fn();
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    // wrapped: the factory runs before the mocks above are initialised
    user: {
      findUnique: (...args: unknown[]): unknown => mockFindUnique(...args),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    presenceLog: { create: jest.fn() },
    $transaction: (...args: unknown[]): unknown => mockTransaction(...args),
  },
}));

import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import type { CollectionAfterChangeHook, PayloadRequest } from 'payload';

const createPayloadLog = jest.fn().mockResolvedValue({ id: 'log' });
const request = {
  payload: { create: createPayloadLog, delete: jest.fn(), logger: { error: jest.fn() } },
} as unknown as PayloadRequest;

/** Runs the Postgres mirror after a user write that moved presence from `before` to `after`. */
const mirror = async (before: boolean, after: boolean): Promise<void> => {
  const [syncUserToPostgres] = (UserCollection.hooks?.afterChange ??
    []) as CollectionAfterChangeHook[];
  await syncUserToPostgres?.({
    doc: { id: 'anna', fullName: 'Anna Muster', presentAtCamp: after, hoefe: ['nord'] },
    previousDoc: { id: 'anna', presentAtCamp: before },
    req: request,
    operation: 'update',
  } as unknown as Parameters<CollectionAfterChangeHook>[0]);
};

describe('mirroring a user to Postgres', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs no check-out when a background write meets a check-in not yet in Payload', async () => {
    // the presence slider already checked Anna in on Postgres; Payload still says absent
    mockFindUnique.mockResolvedValue({ presentAtCamp: true });

    await mirror(false, false);

    expect(createPayloadLog).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('still logs a check-in made with the checkbox in the admin panel', async () => {
    mockFindUnique.mockResolvedValue({ presentAtCamp: false });

    await mirror(false, true);

    expect(createPayloadLog).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'presence-logs' }),
    );
  });
});
