import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/utils/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/utils/auth-helpers', () => ({
  getPayloadUserFromNextAuthUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
}));

const mockSendFcmNotification = jest.fn().mockResolvedValue('sent');
jest.mock('@/lib/firebase-admin', () => ({
  sendFcmNotification: (...args: unknown[]): unknown => mockSendFcmNotification(...args),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://example.test' },
}));

// `superjson` ships untranspiled ESM and is only the wire transformer; a direct caller never
// serializes anything, so a stub keeps this suite out of the ESM transform allowlist.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));

import { nativePushRouter } from '@/features/native-push/api/native-push-router';
import { getPayload } from 'payload';

const createCaller = createCallerFactory(nativePushRouter);

const caller = (): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid: 'auth-user-1' },
    locale: 'de',
  } as unknown as Context);

const register = async (): Promise<{ success: boolean }> =>
  caller().registerDevice({ token: 'token-1', platform: 'android', deviceId: 'device-1' });

const EMPTY = { totalDocs: 0, docs: [] };

interface UpdateArguments {
  id: string;
  data: { token: string; user: string; deviceId: string | null };
}

interface DeviceLookup {
  where: { and: { deviceId?: { equals: string } }[] };
}

const firstUpdateArguments = (update: jest.Mock): UpdateArguments | undefined =>
  (update.mock.calls as unknown[][])[0]?.[0] as UpdateArguments | undefined;

/**
 * A device emits `native-push-token` several times per permission change, so several
 * identical `registerDevice` calls arrive in one batch and race each other. The write
 * is an upsert on the unique `token` so they converge on one row instead of deleting
 * it out from under each other; the retry covers the one race that survives, two
 * calls creating a token nobody holds yet.
 */
describe('nativePushRouter.registerDevice under concurrent registrations', () => {
  const find = jest.fn();
  const update = jest.fn();
  const create = jest.fn();
  const deleteMany = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (getPayload as unknown as jest.Mock).mockResolvedValue({
      find,
      update,
      create,
      delete: deleteMany,
    });
    deleteMany.mockResolvedValue({ docs: [] });
    create.mockResolvedValue({ id: 'sub-1' });
    update.mockResolvedValue({ id: 'sub-1' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * The delete was the whole problem: it made room for a write that a parallel call
   * was about to perform on the row being removed. `token` is unique, so the row can
   * simply be claimed - and nothing else may be deleted to get there.
   */
  it('claims the row that already holds the token instead of deleting it', async () => {
    find.mockResolvedValue({ totalDocs: 1, docs: [{ id: 'sub-existing' }] });

    await expect(register()).resolves.toEqual({ success: true });

    expect(deleteMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();

    const updateArguments = firstUpdateArguments(update);
    expect(updateArguments?.id).toBe('sub-existing');
    expect(updateArguments?.data.token).toBe('token-1');
    expect(updateArguments?.data.user).toBe('user-1');
  });

  it('moves this device to its new token when FCM rotates it', async () => {
    find
      // nobody holds the new token ...
      .mockResolvedValueOnce(EMPTY)
      // ... but this user already has a row for the device
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-device' }] });

    await expect(register()).resolves.toEqual({ success: true });

    expect(create).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();

    const updateArguments = firstUpdateArguments(update);
    expect(updateArguments?.id).toBe('sub-device');
    expect(updateArguments?.data.token).toBe('token-1');
  });

  /**
   * A padded `deviceId` - a legacy or hand-edited `localStorage` entry - has to be
   * stored in the same form it is matched on. Persisting it raw while looking it up
   * trimmed would make the rotation branch above miss the device's own row, so every
   * token rotation would leave another undeliverable subscription behind and welcome
   * the device again.
   */
  it('stores a padded device id in the form it is matched on', async () => {
    find
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-device' }] });

    await expect(
      caller().registerDevice({ token: 'token-1', platform: 'android', deviceId: '  device-1  ' }),
    ).resolves.toEqual({ success: true });

    const deviceLookup = (find.mock.calls as unknown[][])[1]?.[0] as DeviceLookup | undefined;
    const deviceClause = deviceLookup?.where.and.find((clause) => clause.deviceId !== undefined);

    expect(deviceClause?.deviceId?.equals).toBe('device-1');
    expect(firstUpdateArguments(update)?.data.deviceId).toBe('device-1');
  });

  it('creates a subscription and welcomes the device when nothing matches', async () => {
    find.mockResolvedValue(EMPTY);

    await expect(register()).resolves.toEqual({ success: true });

    expect(create).toHaveBeenCalledTimes(1);
    expect(mockSendFcmNotification).toHaveBeenCalledTimes(1);
  });

  it('claims the winner row when a concurrent create took the token first', async () => {
    find
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce(EMPTY)
      // the retry sees the row the competing registration created
      .mockResolvedValue({ totalDocs: 1, docs: [{ id: 'sub-winner' }] });
    create.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));

    await expect(register()).resolves.toEqual({ success: true });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 'sub-winner' }));
    // The row is not this call's creation, so the device must not be welcomed twice.
    expect(mockSendFcmNotification).not.toHaveBeenCalled();
  });

  it('reports success when both attempts fail but the subscription exists anyway', async () => {
    find
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce(EMPTY)
      // the verification lookup after the second failure
      .mockResolvedValue({ totalDocs: 1, docs: [{ id: 'sub-9' }] });
    create.mockRejectedValue(new Error('duplicate key value violates unique constraint'));

    await expect(register()).resolves.toEqual({ success: true });
  });

  it('still fails loudly when the subscription genuinely cannot be stored', async () => {
    find.mockResolvedValue(EMPTY);
    create.mockRejectedValue(new Error('connection pool timeout'));

    await expect(register()).rejects.toBeInstanceOf(TRPCError);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
