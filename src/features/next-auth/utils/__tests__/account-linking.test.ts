jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    HITOBITO_BASE_URL: 'https://cevi.db.example',
    HITOBITO_FORWARD_URL: 'https://cevi.db.example',
    CEVI_DB_CLIENT_ID: 'client-id',
    CEVI_DB_CLIENT_SECRET: 'client-secret',
  },
}));

jest.mock('next-auth', () => ({ customFetch: Symbol('customFetch') }));
jest.mock('next/server', () => ({ after: jest.fn() }));
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('undici', () => ({ Agent: jest.fn(), setGlobalDispatcher: jest.fn() }));

jest.mock('@/utils/tracing-helpers', () => ({
  withSpan: (_name: string, function_: () => unknown): unknown => function_(),
}));

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import type { HitobitoProfile } from '@/features/next-auth/types/hitobito-profile';
import { saveAndFetchUserFromPayload } from '@/features/next-auth/utils/next-auth-config';
import type { BasePayload, Where } from 'payload';

type StoredUser = Record<string, unknown> & { id: string };

const PROFILE: HitobitoProfile = {
  id: 4711,
  payloadUuid: '',
  email: 'ronja@example.com',
  first_name: 'Ronja',
  last_name: 'Muster',
  nickname: 'Fuchs',
  roles: [],
};

/** A users collection that answers the two lookups a login makes, by Cevi.DB id and by email. */
const createUsersCollection = (
  users: StoredUser[],
): { payload: BasePayload; create: jest.Mock; update: jest.Mock } => {
  const find = jest.fn(({ where }: { where: Where }) => {
    const [field, condition] = Object.entries(where)[0] as [string, { equals: unknown }];
    const matches = users.filter((user) => user[field] === condition.equals);
    return Promise.resolve({ docs: matches, totalDocs: matches.length });
  });
  const update = jest.fn(({ id, data }: { id: string; data: Record<string, unknown> }) =>
    Promise.resolve({ ...users.find((user) => user.id === id), ...data }),
  );
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: 'created', ...data }),
  );
  const payload = { find, update, create, jobs: { queue: jest.fn() } } as unknown as BasePayload;
  return { payload, create, update };
};

describe('linking a Cevi.DB login to a user by email', () => {
  it('claims a user that has no Cevi.DB id yet', async () => {
    const { payload, create } = createUsersCollection([
      { id: 'imported', email: 'ronja@example.com' },
    ]);

    const user = await saveAndFetchUserFromPayload(payload, PROFILE);

    expect(user).toMatchObject({ id: 'imported', cevi_db_uuid: 4711 });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a user that belongs to another Cevi.DB person', async () => {
    const { payload, create, update } = createUsersCollection([
      { id: 'someone-else', email: 'ronja@example.com', cevi_db_uuid: 1234 },
    ]);

    await expect(saveAndFetchUserFromPayload(payload, PROFILE)).rejects.toThrow(
      'linked to another Cevi.DB person',
    );
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a user when nobody has the email', async () => {
    const { payload, update } = createUsersCollection([]);

    const user = await saveAndFetchUserFromPayload(payload, PROFILE);

    expect(user).toMatchObject({ id: 'created', cevi_db_uuid: 4711 });
    expect(update).not.toHaveBeenCalled();
  });
});
