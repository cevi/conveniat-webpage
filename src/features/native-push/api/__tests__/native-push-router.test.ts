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

/**
 * A device emits `native-push-token` several times per permission change, so several
 * identical `registerDevice` calls arrive in one batch and race over the same row:
 * one deletes the row another is about to update, and that one fails with a not-found
 * it can recover from by writing again off a fresh read. Before the retry, whoever lost
 * the race returned INTERNAL_SERVER_ERROR and the client reported "registration failed"
 * for a subscription that was in fact stored.
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

  it('retries the write when a competing registration removed the row mid-flight', async () => {
    // First attempt finds the row, but it is gone by the time the update lands. The
    // retry re-reads (now empty) and creates it.
    find
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-1' }] })
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] });
    update.mockRejectedValueOnce(new Error('Nicht gefunden'));

    await expect(register()).resolves.toEqual({ success: true });

    expect(find).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('does not send a second welcome push when the retry only updates an existing row', async () => {
    find
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-1' }] })
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-2' }] });
    update.mockRejectedValueOnce(new Error('Nicht gefunden'));

    await expect(register()).resolves.toEqual({ success: true });

    expect(mockSendFcmNotification).not.toHaveBeenCalled();
  });

  it('reports success when the retry fails but a concurrent write stored the subscription', async () => {
    find
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-1' }] })
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-1' }] })
      // the verification lookup after the second failure
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'sub-9' }] });
    update.mockRejectedValue(new Error('Nicht gefunden'));

    await expect(register()).resolves.toEqual({ success: true });
  });

  it('still fails loudly when the subscription genuinely cannot be stored', async () => {
    find
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] })
      // nothing was persisted for this user
      .mockResolvedValueOnce({ totalDocs: 0, docs: [] });
    create.mockRejectedValue(new Error('connection pool timeout'));

    await expect(register()).rejects.toBeInstanceOf(TRPCError);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
