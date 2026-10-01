/**
 * Both exports of the module are server actions, so each is an endpoint anyone can post to.
 * These cover who may remove a stored push subscription through it.
 */
jest.mock('@payload-config', () => ({}), { virtual: true });

const mockPayloadDelete = jest.fn();
jest.mock('payload', () => ({
  getPayload: (): { delete: jest.Mock } => ({ delete: mockPayloadDelete }),
}));

const mockAuth = jest.fn();
jest.mock('@/utils/auth', () => ({ auth: (): unknown => mockAuth() }));

const mockGetPayloadUser = jest.fn();
jest.mock('@/utils/auth-helpers', () => ({
  getPayloadUserFromNextAuthUser: (...args: unknown[]): unknown => mockGetPayloadUser(...args),
  isValidNextAuthUser: (user: unknown): boolean => user !== undefined,
}));

jest.mock('@/lib/push/send-notification-to-subscription', () => ({
  sendNotificationToSubscription: jest.fn(),
}));

import * as pushNotificationApi from '@/utils/push-notification-api';

const { unsubscribeUser } = pushNotificationApi;

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
