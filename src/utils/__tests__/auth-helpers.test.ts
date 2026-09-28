jest.mock('@/utils/auth', () => ({ getCachedSession: jest.fn() }));

import { getCachedSession } from '@/utils/auth';
import { getAuthenticateUsingCeviDB } from '@/utils/auth-helpers';
import type { AuthStrategyFunctionArgs, Payload } from 'payload';

const authenticate = async (payload: Partial<Payload> = {}): Promise<unknown> => {
  const result = await getAuthenticateUsingCeviDB({ payload } as AuthStrategyFunctionArgs);
  return result.user;
};

describe('getAuthenticateUsingCeviDB', () => {
  // Payload hands the value on through payload.auth(), whose callers tell a visitor who is not
  // signed in by `user === null`; an undefined user took them down the signed-in branch.
  it('reports a visitor without a session as no user, null', async () => {
    // eslint-disable-next-line unicorn/no-null -- getServerSession answers no session with null
    (getCachedSession as jest.Mock).mockResolvedValue(null);
    await expect(authenticate()).resolves.toBeNull();
  });

  it('reports a session without a Payload user as no user, null', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue({
      user: {
        uuid: '0123456789abcdef01234567',
        cevi_db_uuid: 4242,
        email: 'avp@cevi-uster.ch',
        name: 'Test AVP',
        group_ids: [],
      },
    });
    const find = jest.fn().mockResolvedValue({ docs: [] });
    await expect(authenticate({ find })).resolves.toBeNull();
    expect(find).toHaveBeenCalled();
  });
});
