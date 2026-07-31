import type { ChatStatus } from '@/lib/chat-shared';
import type { JsonArray, JsonObject } from '@/lib/prisma/runtime/client';
import type { ChatMembershipPermission, MessageEventType } from '@prisma/client';

export interface ChatMessage {
  id: string;
  createdAt: Date;
  messagePayload: string | number | boolean | JsonObject | JsonArray;
  senderId: string | undefined;
  senderName?: string | undefined;
  status: MessageEventType;
  type: string;
  replyCount?: number | undefined;
  parentId?: string | undefined;
  hasUnreadReplies?: boolean | undefined;
  isAdminMessage?: boolean;
  reactions?: {
    emoji: string;
    userId: string;
    userName: string;
  }[];
  isPendingOffline?: boolean;
}

interface ChatParticipant {
  id: string;
  name: string;
  isOnline: boolean;
  chatPermission: ChatMembershipPermission;
  description?: string | null;
}

export interface ChatDetails {
  name: string;
  id: string;
  type: string;
  status: ChatStatus;
  caseNumber?: string | undefined;
  courseId?: string | null;
  archivedAt: Date | null;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  capabilities: string[];
  description?: string | null;
}
