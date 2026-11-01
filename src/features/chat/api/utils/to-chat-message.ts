import type { ChatMessage, ThreadSummary } from '@/features/chat/api/types';
import { visiblePayloadOf, withoutDeletedQuote } from '@/features/chat/api/utils/deleted-messages';
import type { MessageEventType } from '@prisma/client';

/** A message as `getChatMessages` and `getMessage` read it, with what they include. */
export interface MessageRow {
  uuid: string;
  createdAt: Date;
  senderId: string | null;
  sender?: { name: string } | null;
  type: string;
  parentId: string | null;
  deletedAt?: Date | null;
  contentVersions: { payload: unknown }[];
  _count: { replies: number };
  reactions: { emoji: string; userId: string; user: { name: string } }[];
  /** Replies of others the reader has not read yet, at most one is enough. */
  replies: unknown[];
}

/**
 * The message as a member of its chat sees it. A deleted one keeps its place, its time, its
 * sender and its thread, and loses its content and its reactions. A quote of a deleted message
 * loses the snippet it carried.
 */
export const toChatMessage = (
  message: MessageRow,
  context: {
    status: MessageEventType;
    deletedQuotedIds: ReadonlySet<string>;
    threadSummaries: ReadonlyMap<string, ThreadSummary>;
  },
): ChatMessage => {
  const isDeleted = message.deletedAt !== null && message.deletedAt !== undefined;
  const { payload, quotedMessageDeleted } = withoutDeletedQuote(
    visiblePayloadOf(message),
    context.deletedQuotedIds,
  );
  const threadSummary = context.threadSummaries.get(message.uuid);
  return {
    id: message.uuid,
    createdAt: message.createdAt,
    messagePayload: payload,
    senderId: message.senderId ?? undefined,
    ...(message.sender?.name ? { senderName: message.sender.name } : {}),
    status: context.status,
    type: message.type,
    replyCount: message._count.replies,
    parentId: message.parentId ?? undefined,
    hasUnreadReplies: message.replies.length > 0,
    ...(threadSummary === undefined ? {} : { threadSummary }),
    ...(message.deletedAt instanceof Date ? { deletedAt: message.deletedAt } : {}),
    ...(quotedMessageDeleted ? { quotedMessageDeleted } : {}),
    reactions: isDeleted
      ? []
      : message.reactions.map((reaction) => ({
          emoji: reaction.emoji,
          userId: reaction.userId,
          userName: reaction.user.name,
        })),
  };
};
