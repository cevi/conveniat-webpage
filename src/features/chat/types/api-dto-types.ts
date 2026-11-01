import type { ChatMembershipPermission, ChatType, MessageEventType } from '@prisma/client';

import type { StaticTranslationString } from '@/types/types';

export interface PreviewMessage {
  id: string;
  senderId: string; // 'system' for system messages
  /** Missing for system messages, and in chat lists persisted before this field existed. */
  senderName?: string | undefined;
  messagePreview: string | StaticTranslationString;
  createdAt: Date;
  status: MessageEventType;
}

import type { ChatStatus } from '@/lib/chat-shared';

export interface ChatWithMessagePreview {
  id: string;
  name: string;
  description?: string | null | undefined;
  status: ChatStatus;
  chatType: ChatType;
  caseNumber?: string | undefined;
  lastMessage?: PreviewMessage | undefined;
  lastUpdate: Date;
  unreadCount: number;
  messageCount: number;
  /**
   * Whether the chat has so many members that its unread count is capped at 1. Optional
   * because chat lists persisted before this field existed are restored without it.
   */
  isLarge?: boolean;
  userChatPermission: ChatMembershipPermission;
  /**
   * Whether the chat sits in the pinned group at the top of the list: pinned for everyone
   * (announcement channels, from the CMS) or by the user. Optional because chat lists
   * persisted before this field existed are restored without it.
   */
  isPinned?: boolean;
  /** Pinned for everyone from the CMS; the user cannot unpin it. Optional for old caches. */
  isPinnedForEveryone?: boolean;
  /** Pinned by the user themselves, see `pinChat`. Optional for old caches. */
  isPinnedByMe?: boolean;
  /** Muted by the user, so it sends them no push, see `muteChat`. Optional for old caches. */
  isMuted?: boolean;
  /**
   * Marked unread by the user, see `markChatUnread`; already counted in `unreadCount`.
   * Optional for old caches.
   */
  isMarkedUnread?: boolean;
  /** Optional because chat lists persisted before this field existed are restored without it. */
  isArchived?: boolean;
  /**
   * The other person of a one-to-one chat, for their avatar; missing in other chats and in
   * caches from before.
   */
  partner?: { userId: string; pictureUrl?: string | undefined } | undefined;
}
