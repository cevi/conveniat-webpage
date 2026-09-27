import type { ChatMembershipPermission, ChatType, MessageEventType } from '@prisma/client';

import type { StaticTranslationString } from '@/types/types';

export interface PreviewMessage {
  id: string;
  senderId: string; // 'system' for system messages
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
  /** Optional because chat lists persisted before this field existed are restored without it. */
  isPinned?: boolean;
  /** Optional because chat lists persisted before this field existed are restored without it. */
  isArchived?: boolean;
  /**
   * The other person of a one-to-one chat, for their avatar; missing in other chats and in
   * caches from before.
   */
  partner?: { userId: string; pictureUrl?: string | undefined } | undefined;
}
