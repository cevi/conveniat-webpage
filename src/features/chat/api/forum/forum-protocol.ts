import { forumError } from '@/features/chat/api/forum/forum-errors';
import { isForumZentrale } from '@/features/chat/api/forum/forum-moderator';
import {
  FORUM_FLAG_REASONS,
  FORUM_POST_KINDS,
  FORUM_POST_STATUSES,
  type ForumCapacityValue,
  type ForumFlagReasonValue,
  type ForumPostKindValue,
  type ForumPostStatusValue,
} from '@/lib/forum-shared';
import type { ForumAuditAction } from '@/lib/prisma/enums';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import { trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

/** One entry of a topic's protocol, as its Kernteam reads it in the app. */
export interface ForumProtocolEntry {
  id: string;
  at: Date;
  action: ForumAuditAction;
  actorName: string;
  capacity: ForumCapacityValue;
  /** who handed out the assignment a helper acted on */
  delegatedByName: string | null;
  postId: string;
  postTitle: string;
  /** in a private conversation: its content stays out of the protocol's app view */
  inConversation: boolean;
  note: string | null;
  statusFrom?: ForumPostStatusValue;
  statusTo?: ForumPostStatusValue;
  kindFrom?: ForumPostKindValue;
  kindTo?: ForumPostKindValue;
  reason?: ForumFlagReasonValue;
  /** the text of a hidden or deleted post or comment, so the Kernteam can judge it */
  removedText?: string;
  /** a move, a merge or a forward: where to */
  target?: string;
}

const PAGE_SIZE = 50;

const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const pick = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.find((candidate) => candidate === value);

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * The protocol of one topic and its private conversations, newest first: every change someone
 * made to a post they did not write. For the topic's Kernteam and the Zentrale; the admin panel
 * keeps the view over every topic. A conversation's entries come with their title only.
 */
export const getForumProtocolList = trpcBaseProcedure
  .input(z.object({ topicId: z.uuid(), cursor: z.number().int().min(0).nullish() }))
  .query(
    async ({ ctx, input }): Promise<{ items: ForumProtocolEntry[]; nextCursor: number | null }> => {
      const membership = await ctx.prisma.chatMembership.findUnique({
        where: { userId_chatId: { userId: ctx.user.uuid, chatId: input.topicId } },
        select: { chatPermission: true, chat: { select: { type: true } } },
      });
      const isKernteam =
        membership?.chat.type === ChatType.FORUM &&
        (membership.chatPermission === ChatMembershipPermission.OWNER ||
          membership.chatPermission === ChatMembershipPermission.ADMIN);
      if (!isKernteam && !isForumZentrale(ctx.user)) throw forumError('FORBIDDEN', 'notAllowed');

      const conversations = await ctx.prisma.chat.findMany({
        where: { forumTopicId: input.topicId, type: ChatType.FORUM_CONVERSATION },
        select: { uuid: true },
      });
      const conversationIds = new Set(conversations.map((chat) => chat.uuid));
      const offset = input.cursor ?? 0;
      const rows = await ctx.prisma.forumAuditEvent.findMany({
        where: { chatId: { in: [input.topicId, ...conversationIds] } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: PAGE_SIZE + 1,
      });

      const items = rows.slice(0, PAGE_SIZE).map((row): ForumProtocolEntry => {
        const before = recordOf(row.before);
        const after = recordOf(row.after);
        const inConversation = conversationIds.has(row.chatId);
        const statusFrom = pick(FORUM_POST_STATUSES, before['status']);
        const statusTo = pick(FORUM_POST_STATUSES, after['status']);
        const kindFrom = pick(FORUM_POST_KINDS, before['kind']);
        const kindTo = pick(FORUM_POST_KINDS, after['kind']);
        const reason = pick(FORUM_FLAG_REASONS, after['reason']);
        const removedText = inConversation ? undefined : textOf(before['text']);
        const target =
          textOf(after['topicName']) ?? textOf(after['intoTitle']) ?? textOf(after['assigneeName']);
        return {
          id: row.id,
          at: row.createdAt,
          action: row.action,
          actorName: row.actorName,
          capacity: row.capacity,
          delegatedByName: row.delegatedByName,
          postId: row.messageId,
          postTitle: row.postTitle,
          inConversation,
          note: inConversation ? null : row.note,
          ...(statusFrom === undefined ? {} : { statusFrom }),
          ...(statusTo === undefined ? {} : { statusTo }),
          ...(kindFrom === undefined ? {} : { kindFrom }),
          ...(kindTo === undefined ? {} : { kindTo }),
          ...(reason === undefined ? {} : { reason }),
          ...(removedText === undefined ? {} : { removedText }),
          ...(target === undefined ? {} : { target }),
        };
      });
      return { items, nextCursor: rows.length > PAGE_SIZE ? offset + PAGE_SIZE : null };
    },
  );
