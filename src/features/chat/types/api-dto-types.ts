import type { ChatType, MessageEventType } from '@prisma/client';

export interface PreviewMessage {
  id: string;
  senderId: string | undefined; // undefined for system messages
  messagePreview: string;
  createdAt: Date;
  status: MessageEventType;
}

export interface ChatWithMessagePreview {
  id: string;
  name: string;
  chatType: ChatType;
  lastMessage: PreviewMessage;
  lastUpdate: Date;
  unreadCount: number;
}
