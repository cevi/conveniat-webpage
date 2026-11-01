import type { ChatStatus } from '@/lib/chat-shared';
import type { JsonArray, JsonObject } from '@/lib/prisma/runtime/client';
import type { ChatMembershipPermission, MessageEventType } from '@prisma/client';

/** Who replied in a thread and when last, for the chip under its message. */
export interface ThreadSummary {
  lastReplyAt: Date;
  /** The people with the latest reply first, at most three. */
  repliers: { id: string; name: string; pictureUrl?: string | undefined }[];
  /** How many people replied in all, of whom `repliers` names the first. */
  replierCount: number;
}

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
  /**
   * Who replied and when last, on a message with replies. Missing on one without, from the
   * realtime stream, and in caches persisted before it existed.
   */
  threadSummary?: ThreadSummary | undefined;
  /**
   * When the sender deleted the message for everyone. A deleted message comes without its
   * content and its reactions. Missing on one that stands, and in caches from before.
   */
  deletedAt?: Date | undefined;
  /** The message this one quotes was deleted, and the quote lost its snippet with it. */
  quotedMessageDeleted?: boolean | undefined;
  isAdminMessage?: boolean;
  reactions?: {
    emoji: string;
    userId: string;
    userName: string;
  }[];
  isPendingOffline?: boolean;
  /**
   * Client-only: the server refused or lost this message. The bubble stays in place with a
   * retry action instead of disappearing. Absent in caches persisted by older versions.
   */
  sendFailed?: boolean;
}

interface ChatParticipant {
  id: string;
  name: string;
  isOnline: boolean;
  chatPermission: ChatMembershipPermission;
  description?: string | null;
  /** The profile picture from Cevi.DB; missing without one, and in caches from before. */
  pictureUrl?: string | undefined;
}

export interface ChatDetails {
  name: string;
  id: string;
  type: string;
  status: ChatStatus;
  caseNumber?: string | undefined;
  courseId?: string | null;
  archivedAt: Date | null;
  /** When the chat was created; missing in caches persisted before it was sent. */
  createdAt?: Date | undefined;
  messages: ChatMessage[];
  participants: ChatParticipant[];
  capabilities: string[];
  description?: string | null;
}
