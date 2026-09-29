import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });

const mockPayloadFind = jest.fn();
const mockPayloadUpdate = jest.fn();
jest.mock('payload', () => ({
  getPayload: (): unknown => ({ find: mockPayloadFind, update: mockPayloadUpdate }),
}));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [542],
    CEVIDB_GROUP_TRANSLATION_TEAM: [543],
    CEVIDB_GROUP_PROGRAM_TEAM: [544],
  },
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

const mockSendNotificationToSubscription = jest.fn();
jest.mock('@/utils/push-notification-api', () => ({
  sendNotificationToSubscription: (...args: unknown[]): unknown =>
    mockSendNotificationToSubscription(...args),
}));

import { pushTrackingRouter } from '@/features/push-tracking/api/push-tracking-router';

const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const prisma = { pushNotificationLog: { findMany: mockFindMany, update: mockUpdate } };

const createCaller = createCallerFactory(pushTrackingRouter);

const callerAs = (user: unknown): ReturnType<typeof createCaller> =>
  createCaller({ user, prisma, locale: 'de' } as unknown as Context);

/** No session, as when a service worker reports on behalf of a signed-out browser. */
const signedOut = undefined as unknown;

/** A camp participant: signed in through Cevi.DB, in no admin group. */
const participant = { uuid: 'participant-1', groups: [] };

/** Web core team may edit the site, but not read what any one person was sent. */
const webCoreTeam = { uuid: 'web-1', groups: [{ id: 542 }] };

const fullAdmin = { uuid: 'admin-1', groups: [{ id: 541 }] };

const testSend = {
  subscription: { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } },
  message: 'Hello',
};

describe('pushTrackingRouter access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses the notification history to anyone signed out', async () => {
    await expect(callerAs(signedOut).getRecentLogs({ userId: 'someone' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('refuses the notification history to a participant', async () => {
    await expect(callerAs(participant).getRecentLogs({ userId: 'someone' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('refuses the notification history to the web core team', async () => {
    await expect(callerAs(webCoreTeam).getRecentLogs({ userId: 'someone' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('shows the notification history to a full admin', async () => {
    mockFindMany.mockResolvedValue([{ id: 'log-1' }]);

    await expect(callerAs(fullAdmin).getRecentLogs({ userId: 'someone' })).resolves.toEqual({
      items: [{ id: 'log-1' }],
      nextCursor: undefined,
    });
  });

  it('refuses a test send to the web core team', async () => {
    await expect(callerAs(webCoreTeam).sendTestNotification(testSend)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockSendNotificationToSubscription).not.toHaveBeenCalled();
  });

  it('refuses a test send to anyone signed out', async () => {
    await expect(callerAs(signedOut).sendTestNotification(testSend)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(mockSendNotificationToSubscription).not.toHaveBeenCalled();
  });

  it('refuses a test send to a participant', async () => {
    await expect(callerAs(participant).sendTestNotification(testSend)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockSendNotificationToSubscription).not.toHaveBeenCalled();
  });

  it('still records a tap from a service worker without a session', async () => {
    await expect(
      callerAs(signedOut).markInteracted({ id: 'log-1', type: 'CLICK' }),
    ).resolves.toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'log-1' } }));
  });
});

describe('pushTrackingRouter.renewWebPushSubscription', () => {
  const oldSubscription = {
    endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/old',
    keys: { p256dh: 'old-p256dh', auth: 'old-auth' },
  };
  const newSubscription = {
    endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/new',
    keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('points the stored row at the new subscription, without a session', async () => {
    mockPayloadFind.mockResolvedValue({ docs: [{ id: 'sub-1', user: 'user-1' }] });

    await expect(
      callerAs(signedOut).renewWebPushSubscription({ oldSubscription, newSubscription }),
    ).resolves.toEqual({ renewed: true });

    expect(mockPayloadFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { endpoint: { equals: oldSubscription.endpoint } },
            { 'keys.auth': { equals: 'old-auth' } },
          ],
        },
      }),
    );
    expect(mockPayloadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        data: expect.objectContaining({
          endpoint: newSubscription.endpoint,
          keys: newSubscription.keys,
        }) as unknown,
      }),
    );
  });

  it('changes nothing when no row holds the old endpoint and auth secret', async () => {
    mockPayloadFind.mockResolvedValue({ docs: [] });

    await expect(
      callerAs(signedOut).renewWebPushSubscription({ oldSubscription, newSubscription }),
    ).resolves.toEqual({ renewed: false });
    expect(mockPayloadUpdate).not.toHaveBeenCalled();
  });
});
