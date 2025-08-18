import type { JsonArray, JsonObject } from '@/lib/prisma/runtime/client';

export enum MessageStatusDto {
  CREATED = 'CREATED',
  STORED = 'STORED',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export interface MessageDto {
  id: string;
  // undefined for system messages
  senderId: string | undefined;
  messagePayload: string | number | boolean | JsonObject | JsonArray;
  createdAt: Date;
  status: MessageStatusDto;
}

export interface ChatDto {
  id: string;
  name: string;
  lastMessage?: MessageDto;
  lastUpdate: Date;
  unreadCount: number;
}
