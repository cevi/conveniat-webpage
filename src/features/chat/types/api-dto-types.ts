import type { ChatType, MessageEventType } from '@prisma/client';

export interface FirstChatMessage {
  id: string;
  // undefined for system messages
  senderId: string | undefined;
  messagePreview: string;
  createdAt: Date;
  status: MessageEventType;
}

export interface ChatDto {
  id: string;
  name: string;
  chatType: ChatType;
  lastMessage?: FirstChatMessage;
  lastUpdate: Date;
  unreadCount: number;
}
