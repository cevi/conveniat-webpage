import { environmentVariables } from '@/config/environment-variables';
import { deleteEverything } from '@/features/payload-cms/payload-cms/initialization';
import { resetServerData } from '@/features/payload-cms/payload-cms/initialization/deleting/reset-api';
import { auth } from '@/utils/auth';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NODE_ENV: 'production' },
}));
jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  hasAccessToThisUser: (): boolean => true,
  Roles: { FullAdmin: 'full-admin' },
}));
jest.mock('@/features/payload-cms/payload-cms/initialization', () => ({
  deleteEverything: jest.fn().mockResolvedValue(void 0),
  onPayloadInit: jest.fn().mockResolvedValue(void 0),
}));
jest.mock('@/utils/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { uuid: 'admin' } }),
}));
jest.mock('@/utils/auth-helpers', () => ({ isValidNextAuthUser: (): boolean => true }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): { warn: jest.Mock } => ({ warn: jest.fn() }),
}));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('payload', () => ({ getPayload: jest.fn().mockResolvedValue({}) }));

const mockedEnvironment = environmentVariables as { NODE_ENV: string };

describe('resetServerData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['production', 'test'])(
    'refuses a full admin when NODE_ENV is %s',
    async (nodeEnvironment) => {
      mockedEnvironment.NODE_ENV = nodeEnvironment;

      await expect(resetServerData()).rejects.toThrow('only allowed in development');
      expect(auth).not.toHaveBeenCalled();
      expect(deleteEverything).not.toHaveBeenCalled();
    },
  );

  it('resets for a full admin in development', async () => {
    mockedEnvironment.NODE_ENV = 'development';

    await resetServerData();
    expect(deleteEverything).toHaveBeenCalledTimes(1);
  });
});
