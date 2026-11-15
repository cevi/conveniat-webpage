import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });

const mockPayloadFind = jest.fn();
const mockPayloadUpdate = jest.fn();
const mockPayloadDelete = jest.fn();
jest.mock('payload', () => ({
  getPayload: (): unknown => ({
    find: mockPayloadFind,
    update: mockPayloadUpdate,
    delete: mockPayloadDelete,
  }),
}));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/utils/auth-helpers', () => ({
  getPayloadUserFromNextAuthUser: (): Promise<{ id: string }> =>
    Promise.resolve({ id: 'user-lena' }),
}));
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
    CEVIDB_GROUP_HELPER_POOL: [],
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

const mockHeaders = new Headers({ 'user-agent': 'Mozilla/5.0 (iPhone) Safari/604.1' });
jest.mock('next/headers', () => ({
  headers: (): Promise<Headers> => Promise.resolve(mockHeaders),
}));

const mockSendNotificationToSubscription = jest.fn();
jest.mock('@/lib/push/send-notification-to-subscription', () => ({
  sendNotificationToSubscription: (...args: unknown[]): unknown =>
    mockSendNotificationToSubscription(...args),
}));

import { pushTrackingRouter } from '@/features/push-tracking/api/push-tracking-router';

const mockFindMany = jest.fn();
const mockUpdateManyAndReturn = jest.fn();
const mockGroupBy = jest.fn();
const prisma = {
  pushNotificationLog: {
    findMany: mockFindMany,
    updateManyAndReturn: mockUpdateManyAndReturn,
    groupBy: mockGroupBy,
  },
};

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
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    keys: { p256dh: 'p', auth: 'a' },
  },
  message: 'Hello',
};

describe('pushTrackingRouter access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateManyAndReturn.mockResolvedValue([{ channel: 'WEB_PUSH', kind: 'CHAT' }]);
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
    mockGroupBy.mockResolvedValue([]);
    mockFindMany.mockResolvedValue([{ id: 'log-1' }]);

    await expect(callerAs(fullAdmin).getRecentLogs({ userId: 'someone' })).resolves.toEqual({
      items: [{ id: 'log-1' }],
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
    expect(mockUpdateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'log-1' } }),
    );
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

  // The call needs no session, so anyone holding a subscription of their own could otherwise
  // point its row, and every push that follows, at a host inside the cluster.
  it('refuses to point a row at an endpoint that belongs to no push service', async () => {
    mockPayloadFind.mockResolvedValue({ docs: [{ id: 'sub-1', user: 'user-1' }] });

    await expect(
      callerAs(signedOut).renewWebPushSubscription({
        oldSubscription,
        newSubscription: { ...newSubscription, endpoint: 'https://payload:3000/api/users' },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockPayloadUpdate).not.toHaveBeenCalled();
  });

  it('changes nothing when no row holds the old endpoint and auth secret', async () => {
    mockPayloadFind.mockResolvedValue({ docs: [] });

    await expect(
      callerAs(signedOut).renewWebPushSubscription({ oldSubscription, newSubscription }),
    ).resolves.toEqual({ renewed: false });
    expect(mockPayloadUpdate).not.toHaveBeenCalled();
  });
});

/** The `data` of the first row update. */
const updateData = (): Record<string, unknown> =>
  (mockUpdateManyAndReturn.mock.calls as [{ data: Record<string, unknown> }][])[0]?.[0].data ?? {};

describe('pushTrackingRouter delivery reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateManyAndReturn.mockResolvedValue([{ channel: 'WEB_PUSH', kind: 'CHAT' }]);
  });

  /**
   * The server only learns that the push service accepted a send. A row reaching
   * DELIVERED is the device's word that the push arrived, and the user agent says which
   * device that was.
   */
  it('marks the row delivered and records the reporting device', async () => {
    await callerAs(signedOut).markDelivered({ id: 'log-1', presentation: 'SHOWN' });

    expect(updateData()).toEqual(
      expect.objectContaining({
        status: 'DELIVERED',
        deliveredAt: expect.any(Date) as unknown,
        userAgent: 'Mozilla/5.0 (iPhone) Safari/604.1',
      }),
    );
    expect(updateData()).not.toHaveProperty('interactionType');
  });

  it('records a push the device kept out of the notification shade', async () => {
    await callerAs(signedOut).markDelivered({ id: 'log-1', presentation: 'SUPPRESSED' });

    expect(updateData()).toEqual(
      expect.objectContaining({ status: 'DELIVERED', interactionType: 'SUPPRESSED' }),
    );
  });

  /** A service worker installed before the field existed keeps reporting deliveries. */
  it('accepts a report without a presentation', async () => {
    await expect(callerAs(signedOut).markDelivered({ id: 'log-1' })).resolves.toEqual({
      success: true,
    });
    expect(updateData()).toEqual(expect.objectContaining({ status: 'DELIVERED' }));
  });

  /**
   * A phone that was offline reports long after the send, and the row may be gone by then.
   * That is the normal end of a stale report, so it answers instead of failing the call.
   */
  it('answers a delivery report for a row that no longer exists', async () => {
    mockUpdateManyAndReturn.mockResolvedValue([]);

    await expect(
      callerAs(signedOut).markDelivered({ id: 'log-gone', presentation: 'SHOWN' }),
    ).resolves.toEqual({ success: false });
  });

  it('answers a click on a push whose row no longer exists', async () => {
    mockUpdateManyAndReturn.mockResolvedValue([]);

    await expect(
      callerAs(signedOut).markInteracted({ id: 'log-gone', type: 'CLICK' }),
    ).resolves.toEqual({ success: false });
  });
});

describe('pushTrackingRouter push devices of a person', () => {
  const lenasPhone = {
    id: 'device-1',
    platform: 'web',
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/141.0.0.0 Mobile Safari/537.36',
    registrationSource: '/entrypoint',
    lastUsedAt: '2026-11-05T12:00:00.000Z',
  };

  beforeEach(() => {
    mockPayloadFind.mockReset();
    mockPayloadDelete.mockReset();
  });

  it('lists them for a full admin', async () => {
    mockPayloadFind.mockResolvedValue({ docs: [lenasPhone] });

    await expect(callerAs(fullAdmin).getPushDeviceList({ userId: 'user-lena' })).resolves.toEqual([
      lenasPhone,
    ]);
    expect(mockPayloadFind).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user: { equals: 'user-lena' } } }),
    );
  });

  it('refuses the list and the removal to the web core team', async () => {
    await expect(
      callerAs(webCoreTeam).getPushDeviceList({ userId: 'user-lena' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(callerAs(webCoreTeam).deletePushDevice({ id: 'device-1' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockPayloadFind).not.toHaveBeenCalled();
    expect(mockPayloadDelete).not.toHaveBeenCalled();
  });

  it('removes a device for a full admin', async () => {
    mockPayloadDelete.mockResolvedValue({ docs: [{ ...lenasPhone, user: 'user-lena' }] });

    await expect(callerAs(fullAdmin).deletePushDevice({ id: 'device-1' })).resolves.toEqual({
      removed: true,
    });
  });

  it('answers a device that is already gone without an error', async () => {
    // removed in another tab, or pruned by a send that met an expired subscription
    mockPayloadDelete.mockResolvedValue({ docs: [] });

    await expect(callerAs(fullAdmin).deletePushDevice({ id: 'device-1' })).resolves.toEqual({
      removed: false,
    });
  });
});

/** A moment the given number of minutes ago. */
const at = (minutesAgo: number): Date => new Date(Date.now() - minutesAgo * 60_000);

describe('pushTrackingRouter.getRecentLogs', () => {
  beforeEach(() => {
    mockGroupBy.mockReset();
    mockFindMany.mockReset();
  });

  it('counts a push to several devices as one of the last 20 entries', async () => {
    mockGroupBy.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({
        notificationId: `push-${String(index)}`,
        _max: { sentAt: at(index + 1) },
      })),
    );
    // a test send older than all 20 pushes, and the rows of the pushes themselves
    mockFindMany
      .mockResolvedValueOnce([{ id: 'test-send', sentAt: at(60) }])
      .mockResolvedValueOnce([{ id: 'row' }]);

    await callerAs(fullAdmin).getRecentLogs({ userId: 'user-lena' });

    expect(mockGroupBy).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
    const [, rowsQuery] = mockFindMany.mock.calls as [unknown, [{ where: unknown }]];
    expect(rowsQuery[0].where).toEqual({
      userId: 'user-lena',
      OR: [
        {
          notificationId: {
            in: Array.from({ length: 20 }, (_, index) => `push-${String(index)}`),
          },
        },
        { id: { in: [] } },
      ],
    });
  });

  it('mixes test sends and pushes by when they were sent', async () => {
    mockGroupBy.mockResolvedValue([{ notificationId: 'push-chat', _max: { sentAt: at(30) } }]);
    mockFindMany
      .mockResolvedValueOnce([{ id: 'test-send', sentAt: at(5) }])
      .mockResolvedValueOnce([]);

    await callerAs(fullAdmin).getRecentLogs({ userId: 'user-lena' });

    const [, rowsQuery] = mockFindMany.mock.calls as [unknown, [{ where: unknown }]];
    expect(rowsQuery[0].where).toEqual({
      userId: 'user-lena',
      OR: [{ notificationId: { in: ['push-chat'] } }, { id: { in: ['test-send'] } }],
    });
  });
});

describe('pushTrackingRouter.confirmWebPushSubscription', () => {
  const lenasPhone = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/lena',
    keys: { p256dh: 'p256dh-lena', auth: 'auth-lena' },
  };

  beforeEach(() => mockPayloadUpdate.mockReset());

  it("renews only the signed-in person's own row with that endpoint and auth secret", async () => {
    mockPayloadUpdate.mockResolvedValue({ docs: [{ id: 'row-1' }] });

    await expect(callerAs(participant).confirmWebPushSubscription(lenasPhone)).resolves.toEqual({
      confirmed: true,
    });
    const [update] = mockPayloadUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(update['where']).toEqual({
      and: [
        { user: { equals: 'user-lena' } },
        { endpoint: { equals: lenasPhone.endpoint } },
        { 'keys.auth': { equals: 'auth-lena' } },
      ],
    });
    expect(typeof (update['data'] as { lastUsedAt?: unknown }).lastUsedAt).toBe('string');
  });

  it('leaves a removed device removed', async () => {
    // an admin removed the device, or a send found it expired
    mockPayloadUpdate.mockResolvedValue({ docs: [] });

    await expect(callerAs(participant).confirmWebPushSubscription(lenasPhone)).resolves.toEqual({
      confirmed: false,
    });
  });

  it('refuses a check-in without a session', async () => {
    await expect(callerAs(signedOut).confirmWebPushSubscription(lenasPhone)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(mockPayloadUpdate).not.toHaveBeenCalled();
  });
});
