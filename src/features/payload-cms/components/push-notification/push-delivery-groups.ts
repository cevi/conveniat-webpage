/** Where one delivery of a push stands, as the history shows it. */
export type DeliveryStatus =
  'failed' | 'interacted' | 'suppressed' | 'delivered' | 'sent' | 'retrying' | 'pending';

/** The fields of a push log row the history reads. */
export interface PushDelivery {
  id: string;
  notificationId: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  error: string | null;
  deliveredAt: Date | string | null;
  interactedAt: Date | string | null;
  interactionType: string | null;
}

/** One push and its deliveries, one per device it went to. */
export interface PushDeliveryGroup<Delivery extends PushDelivery> {
  key: string;
  deliveries: Delivery[];
  /** The furthest any device got, so a push that reached one phone reads as delivered. */
  status: DeliveryStatus;
}

/** Further along first: what the person did beats what the device reported. */
const STATUS_RANK: Record<DeliveryStatus, number> = {
  interacted: 6,
  delivered: 5,
  suppressed: 4,
  sent: 3,
  retrying: 2,
  pending: 1,
  failed: 0,
};

/** Where one delivery stands. */
export const deliveryStatusOf = (delivery: PushDelivery): DeliveryStatus => {
  if (delivery.status === 'FAILED') return 'failed';
  // Still queued after a failed attempt: the error is the last one, not the verdict.
  if (delivery.status === 'PENDING' && delivery.error !== null) return 'retrying';
  if (delivery.interactedAt !== null) return 'interacted';
  // The device received it but showed nothing, because the app was open on the chat.
  if (delivery.interactionType === 'SUPPRESSED') return 'suppressed';
  if (delivery.status === 'DELIVERED' || delivery.deliveredAt !== null) return 'delivered';
  if (delivery.status === 'SENT') return 'sent';
  return 'pending';
};

/**
 * Folds the deliveries of one push into one entry, in the order the pushes came. A push goes to
 * every device of a person, and each device has its own log row. A row without a push, a test
 * send to one device or a row from before the queue, stays an entry of its own.
 */
export const groupDeliveriesByPush = <Delivery extends PushDelivery>(
  deliveries: Delivery[],
): PushDeliveryGroup<Delivery>[] => {
  const groups = new Map<string, Delivery[]>();
  for (const delivery of deliveries) {
    const key = delivery.notificationId ?? `delivery:${delivery.id}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [delivery]);
    else group.push(delivery);
  }
  return [...groups].map(([key, members]) => ({
    key,
    deliveries: members,
    status: members
      .map((delivery) => deliveryStatusOf(delivery))
      .reduce((best, status) => (STATUS_RANK[status] > STATUS_RANK[best] ? status : best)),
  }));
};
