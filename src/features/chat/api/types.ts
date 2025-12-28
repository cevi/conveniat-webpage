import type { JsonArray, JsonObject } from '@/lib/prisma/runtime/client';
import type { ChatMembershipPermission, MessageEventType } from '@prisma/client';

export interface ChatMessage {
  id: string;
  createdAt: Date;
  messagePayload: string | number | boolean | JsonObject | JsonArray;
  senderId: string | undefined;
  status: MessageEventType;
  type: string;
  replyCount?: number | undefined;
  parentId?: string | undefined;
  hasUnreadReplies?: boolean | undefined;
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
  type: string;
  archivedAt: Date | null;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  capabilities: { capability: string; isEnabled: boolean }[];
}
