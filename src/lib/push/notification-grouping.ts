import { PushNotificationKind } from '@/lib/prisma';
import { announcementNotificationTag, chatNotificationTag } from '@/utils/notification-tags';

/**
 * Where a web notification goes: the messages of a chat share one notification that lists the
 * newest of them, every announcement gets its own so the next one cannot hide it, and anything
 * else stands alone: an emergency, a subscription confirmation, an admin test.
 *
 * An emergency is never stacked. A notification of its own alerts in every browser without
 * relying on `renotify` (Chrome only) or on closing and re-showing the previous one, and
 * nothing that arrives after it can replace it.
 */
export const notificationGroupingOf = (
  kind: PushNotificationKind,
  chatId: string | undefined,
  messageId: string | undefined,
): { tag?: string; stack?: boolean } => {
  if (kind === PushNotificationKind.ANNOUNCEMENT) {
    return messageId === undefined ? {} : { tag: announcementNotificationTag(messageId) };
  }
  if (
    kind === PushNotificationKind.SYSTEM ||
    kind === PushNotificationKind.EMERGENCY ||
    chatId === undefined
  ) {
    return {};
  }
  return { tag: chatNotificationTag(chatId), stack: true };
};
