import type { JsonArray, JsonObject } from '@/lib/prisma/runtime/client';
import type { ChatMembershipPermission, MessageEventType } from '@prisma/client';

export interface ChatMessage {
  id: string;
  createdAt: Date;
  messagePayload: string | number | boolean | JsonObject | JsonArray;
  senderId: string | undefined;
  status: MessageEventType;
}

interface ChatParticipant {
  id: string;
  name: string;
  isOnline: boolean;
  chatPermission: ChatMembershipPermission;
}

export interface ChatDetails {
  name: string;
  id: string;
  archivedAt: Date | null;
  messages: ChatMessage[];
  participants: ChatParticipant[];
}
