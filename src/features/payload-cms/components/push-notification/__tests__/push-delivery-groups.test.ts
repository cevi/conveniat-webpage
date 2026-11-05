import {
  groupDeliveriesByPush,
  type PushDelivery,
} from '@/features/payload-cms/components/push-notification/push-delivery-groups';

const delivery = (id: string, overrides: Partial<PushDelivery> = {}): PushDelivery => ({
  id,
  notificationId: 'push-tagesstart',
  status: 'SENT',
  error: null,
  deliveredAt: null,
  interactedAt: null,
  interactionType: null,
  ...overrides,
});

describe('groupDeliveriesByPush', () => {
  it('shows a push sent to three devices once', () => {
    const groups = groupDeliveriesByPush([delivery('phone'), delivery('laptop'), delivery('app')]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.deliveries.map((member) => member.id)).toEqual(['phone', 'laptop', 'app']);
  });

  it('keeps pushes apart, in the order they came', () => {
    const groups = groupDeliveriesByPush([
      delivery('a', { notificationId: 'push-chat' }),
      delivery('b', { notificationId: 'push-tagesstart' }),
      delivery('c', { notificationId: 'push-chat' }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(['push-chat', 'push-tagesstart']);
    expect(groups[0]?.deliveries.map((member) => member.id)).toEqual(['a', 'c']);
  });

  it('keeps each test send on its own', () => {
    const groups = groupDeliveriesByPush([
      delivery('first', { notificationId: null }),
      delivery('second', { notificationId: null }),
    ]);

    expect(groups).toHaveLength(2);
  });

  it('reads as far as the furthest device got', () => {
    const [group] = groupDeliveriesByPush([
      delivery('laptop', { status: 'FAILED', error: 'Push service answered 410' }),
      delivery('phone', { status: 'DELIVERED', deliveredAt: '2027-07-24T07:00:00.000Z' }),
    ]);

    expect(group?.status).toBe('delivered');
  });

  it('reads as failed only when every device failed', () => {
    const [group] = groupDeliveriesByPush([
      delivery('laptop', { status: 'FAILED', error: 'Push service answered 410' }),
      delivery('phone', { status: 'FAILED', error: 'Push service answered 404' }),
    ]);

    expect(group?.status).toBe('failed');
  });
});
