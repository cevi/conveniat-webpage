import type { ChatMessage } from '@/features/chat/api/types';
import { visiblePayloadOf, withoutDeletedQuote } from '@/features/chat/api/utils/deleted-messages';
import type { MessageThread } from '@/features/chat/api/utils/thread-summaries';
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
    threads: ReadonlyMap<string, MessageThread>;
    /** the senders who are the Kernteam of the forum topic, see `findTopicAdminIds` */
    topicAdminIds?: ReadonlySet<string>;
  },
): ChatMessage => {
  const isDeleted = message.deletedAt !== null && message.deletedAt !== undefined;
  const { payload, quotedMessageDeleted } = withoutDeletedQuote(
    visiblePayloadOf(message),
    context.deletedQuotedIds,
  );
  const thread = context.threads.get(message.uuid);
  return {
    id: message.uuid,
    createdAt: message.createdAt,
    messagePayload: payload,
    senderId: message.senderId ?? undefined,
    ...(message.sender?.name ? { senderName: message.sender.name } : {}),
    ...(message.senderId !== null && context.topicAdminIds?.has(message.senderId) === true
      ? { byTopicAdmin: true }
      : {}),
    status: context.status,
    type: message.type,
    replyCount: thread?.replyCount ?? 0,
    parentId: message.parentId ?? undefined,
    hasUnreadReplies: message.replies.length > 0,
    ...(thread === undefined ? {} : { threadSummary: thread.summary }),
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
