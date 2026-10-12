/**
 * Both exports of the module are server actions, so each is an endpoint anyone can post to.
 * These cover what may be stored through it, and who may remove a stored push subscription.
 */
jest.mock('@payload-config', () => ({}), { virtual: true });

const mockPayloadDelete = jest.fn();
const mockPayloadFind = jest.fn();
const mockPayloadCreate = jest.fn();
jest.mock('payload', () => ({
  getPayload: (): Record<string, jest.Mock> => ({
    delete: mockPayloadDelete,
    find: mockPayloadFind,
    create: mockPayloadCreate,
  }),
}));

const mockAuth = jest.fn();
jest.mock('@/utils/auth', () => ({ auth: (): unknown => mockAuth() }));

const mockGetPayloadUser = jest.fn();
jest.mock('@/utils/auth-helpers', () => ({
  getPayloadUserFromNextAuthUser: (...args: unknown[]): unknown => mockGetPayloadUser(...args),
  isValidNextAuthUser: (user: unknown): boolean => user !== undefined,
}));

const mockSendNotificationToSubscription = jest.fn();
jest.mock('@/lib/push/send-notification-to-subscription', () => ({
  sendNotificationToSubscription: (...args: unknown[]): unknown =>
    mockSendNotificationToSubscription(...args),
}));

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ warn: jest.fn() }),
}));

import * as pushNotificationApi from '@/utils/push-notification-api';

const { subscribeUser, unsubscribeUser } = pushNotificationApi;

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'p256dh', auth: 'auth' },
};

const deletedWhere = (): unknown =>
  (mockPayloadDelete.mock.calls as { where: unknown }[][]).at(-1)?.[0]?.where;

describe('push notification server actions', () => {
  beforeEach(() => {
    // Back to no session and no Payload user, which is what a stranger's request looks like.
    jest.resetAllMocks();
  });

  // Anything exported here can be called with arguments of the caller's choosing, so a
  // helper that sends or deletes on trust has to live in a module that is not an action file.
  it('exposes nothing but subscribing and unsubscribing', () => {
    expect(Object.keys(pushNotificationApi).toSorted()).toEqual([
      'subscribeUser',
      'unsubscribeUser',
    ]);
  });

  it('stores the subscription of a signed-in person and confirms it with a push', async () => {
    mockAuth.mockResolvedValue({ user: { uuid: 'user-1' } });
    mockGetPayloadUser.mockResolvedValue({ id: 'user-1' });
    mockPayloadFind.mockResolvedValue({ totalDocs: 0, docs: [] });

    await expect(subscribeUser(subscription, 'de')).resolves.toEqual({ success: true });

    expect(mockPayloadCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endpoint: subscription.endpoint,
          user: 'user-1',
        }) as unknown,
      }),
    );
    expect(mockSendNotificationToSubscription).toHaveBeenCalled();
  });

  // The endpoint is where the server posts every later push, and the confirmation right away.
  it('neither stores nor pushes to an endpoint that belongs to no push service', async () => {
    mockAuth.mockResolvedValue({ user: { uuid: 'user-1' } });
    mockGetPayloadUser.mockResolvedValue({ id: 'user-1' });

    const result = await subscribeUser(
      { ...subscription, endpoint: 'https://payload:3000/api/users' },
      'de',
    );

    expect(result).toEqual({ success: false });
    expect(mockPayloadCreate).not.toHaveBeenCalled();
    expect(mockPayloadDelete).not.toHaveBeenCalled();
    expect(mockSendNotificationToSubscription).not.toHaveBeenCalled();
  });

  it('deletes nothing for a caller without a session', async () => {
    const result = await unsubscribeUser(subscription);

    expect(result).toEqual({ success: false });
    expect(mockPayloadDelete).not.toHaveBeenCalled();
  });

  it("removes the subscription only from the signed-in person's own rows", async () => {
    mockAuth.mockResolvedValue({ user: { uuid: 'user-1' } });
    mockGetPayloadUser.mockResolvedValue({ id: 'user-1' });

    const result = await unsubscribeUser(subscription);

    expect(result).toEqual({ success: true });
    expect(deletedWhere()).toEqual({
      and: [
        { endpoint: { equals: subscription.endpoint } },
        { keys: { equals: subscription.keys } },
        { user: { equals: 'user-1' } },
      ],
    });
  });

  // `subscribeUser` stores such a session's subscription without an owner, and this is the
  // only way that row is ever removed again.
  it('removes an ownerless subscription for a session that has no Payload user', async () => {
    mockAuth.mockResolvedValue({ user: { uuid: 'user-2' } });

    await unsubscribeUser(subscription);

    expect(deletedWhere()).toEqual({
      and: [
        { endpoint: { equals: subscription.endpoint } },
        { keys: { equals: subscription.keys } },
        { user: { exists: false } },
      ],
    });
  });
});
