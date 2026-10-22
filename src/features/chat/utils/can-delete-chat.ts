import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';

const DELETING_PERMISSIONS = new Set<ChatMembershipPermission>([
  ChatMembershipPermission.OWNER,
  ChatMembershipPermission.ADMIN,
]);

/**
 * Whether the user may delete a chat from the list: an archived or emergency chat from their
 * own view, any other one, for everyone, as its owner or admin. Never an announcement
 * channel. Mirrors `canUserArchiveChat` on the server.
 */
export const canDeleteChat = (
  chat: Pick<ChatWithMessagePreview, 'chatType' | 'isArchived' | 'userChatPermission'>,
): boolean =>
  chat.chatType !== ChatType.ANNOUNCEMENT &&
  (chat.isArchived === true ||
    chat.chatType === ChatType.EMERGENCY ||
    DELETING_PERMISSIONS.has(chat.userChatPermission));
