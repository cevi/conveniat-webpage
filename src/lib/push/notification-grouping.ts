import { PushNotificationKind } from '@/lib/prisma';
import {
  announcementNotificationTag,
  chatNotificationTag,
  emergencyNotificationTag,
} from '@/utils/notification-tags';

/**
 * Where a web notification goes: the messages of a chat (and a problem report in its support
 * chat) share one notification that lists the newest of them, every announcement gets its own
 * so the next one cannot hide it, and a subscription confirmation or an admin test stands alone.
 *
 * An emergency is never stacked. A notification of its own alerts in every browser without
 * relying on `renotify` (Chrome only) or on closing and re-showing the previous one, and
 * nothing that arrives after it can replace it. Its tag carries the chat id, so reading the
 * chat closes all of them.
 */
export const notificationGroupingOf = (
  kind: PushNotificationKind,
  chatId: string | undefined,
  messageId: string | undefined,
): { tag?: string; stack?: boolean } => {
  if (kind === PushNotificationKind.ANNOUNCEMENT) {
    return messageId === undefined ? {} : { tag: announcementNotificationTag(messageId) };
  }
  if (kind === PushNotificationKind.EMERGENCY) {
    return chatId === undefined || messageId === undefined
      ? {}
      : { tag: emergencyNotificationTag(chatId, messageId) };
  }
  if (kind === PushNotificationKind.SYSTEM || chatId === undefined) return {};
  return { tag: chatNotificationTag(chatId), stack: true };
};
