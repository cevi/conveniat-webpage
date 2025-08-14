import type { ChatMembershipPermission } from '@/lib/prisma/client';

export enum MessageStatusDto {
  CREATED = 'CREATED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export interface MessageDto {
  id: string;
  // undefined for system messages
  senderId: string | undefined;
  content: string;
  timestamp: Date;
  status: MessageStatusDto;
}

export interface ChatDto {
  id: string;
  name: string;
  lastMessage?: MessageDto;
  lastUpdate: Date;
  unreadCount: number;
}

export interface SendMessageDto {
  chatId: string;
  content: string;
  timestamp: Date;
}

export interface ParticipantDto {
  chatPermission: ChatMembershipPermission;
  id: string;
  name: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface ChatDetailDto {
  id: string;
  name: string;
  isArchived: boolean;
  messages: MessageDto[];
  participants: ParticipantDto[];
  isGroupChat?: boolean;
  lastActivity?: string;
}

export interface ChangeMessageStatus {
  messageId: string;
  status: MessageStatusDto;
}
