import type { ChatType, MessageEventType } from '@prisma/client';

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
  description: string | null;
  status: ChatStatus;
  chatType: ChatType;
  lastMessage: PreviewMessage;
  lastUpdate: Date;
  unreadCount: number;
  messageCount: number;
}
