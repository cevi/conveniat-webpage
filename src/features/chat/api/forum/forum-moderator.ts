import { findActivePiketShift, type PiketShift } from '@/features/chat/api/utils/piket-service';
import {
  FORUM_ZENTRALE_ROLES,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import {
  ChatMembershipPermission,
  ChatType,
  type ForumAuditAction,
  type Prisma,
} from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';

/** Who acts in the forum: the session user, whose groups hold the Forum-Zentrale role. */
export interface ForumUser {
  uuid: string;
  group_ids: number[];
}

/**
 * Why someone may change a post they did not write. Besides the Forum-Zentrale role, the
 * forum's rights come from three places that are no role: the topic's chat membership (its
 * Kernteam are owners and admins), the piket schedule, and an open forward of the post.
 * AGENTS.md records this as the deliberate exception to "every right comes from a role", next
 * to chat membership.
 */
export type ForumModerator =
  | { capacity: 'TOPIC_ADMIN' }
  | { capacity: 'PIKET'; shift: PiketShift }
  | { capacity: 'ZENTRALE' }
  | {
      capacity: 'DELEGATE';
      assignment: { id: string; assignedById: string; assignedByName: string };
    };

/** Everything but a helper: pin, answer, merge, delete, hand out and withdraw assignments. */
export const isFullModerator = (
  moderator: ForumModerator | undefined,
): moderator is Exclude<ForumModerator, { capacity: 'DELEGATE' }> =>
  moderator !== undefined && moderator.capacity !== 'DELEGATE';

/** Whether someone staffs the Zentrale all year, see `FORUM_ZENTRALE_ROLES`. */
export const isForumZentrale = (user: ForumUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: FORUM_ZENTRALE_ROLES });

/**
 * Decides whether `user` may moderate `postId` in topic `chatId`, and in which capacity. The
 * strongest one wins, so a Kernteam member on piket duty acts as Kernteam.
 *
 * @param postId - the post, for an assignment; without it only the topic-wide rights count
 */
export const resolveForumModerator = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  chatId: string,
  postId?: string,
  now: Date = new Date(),
): Promise<ForumModerator | undefined> => {
  const userId = user.uuid;
  const membership = await prisma.chatMembership.findUnique({
    where: { userId_chatId: { userId, chatId } },
    select: { chatPermission: true, chat: { select: { type: true } } },
  });
  // the piket sync makes whoever is on duty a member within a minute; until then the shift
  // alone counts, so the chat's type is read without the membership
  const chat =
    membership?.chat ??
    (await prisma.chat.findUnique({ where: { uuid: chatId }, select: { type: true } }));
  const chatType = chat?.type;
  if (chatType !== ChatType.FORUM) return undefined;
  if (
    membership?.chatPermission === ChatMembershipPermission.OWNER ||
    membership?.chatPermission === ChatMembershipPermission.ADMIN
  ) {
    return { capacity: 'TOPIC_ADMIN' };
  }

  const shift = await findActivePiketShift(userId, ChatType.FORUM, now);
  if (shift !== undefined) return { capacity: 'PIKET', shift };
  if (isForumZentrale(user)) return { capacity: 'ZENTRALE' };

  if (postId === undefined) return undefined;
  // a claim of one's own grants nothing; only a forward does
  const assignment = await prisma.forumPostAssignment.findFirst({
    where: { messageId: postId, assigneeId: userId, endedAt: null, kind: 'HELPER' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, assignedById: true, assignedBy: { select: { name: true } } },
  });
  if (assignment === null) return undefined;
  return {
    capacity: 'DELEGATE',
    assignment: {
      id: assignment.id,
      assignedById: assignment.assignedById,
      assignedByName: assignment.assignedBy.name,
    },
  };
};

/**
 * The topics `user` moderates, for who sees posts that wait for approval: all of them on forum
 * piket duty and for the Forum-Zentrale, else the topics whose Kernteam they are.
 */
export const findModeratedTopicIds = async (
  prisma: PrismaClientOrTransaction,
  user: ForumUser,
  now: Date = new Date(),
): Promise<'all' | string[]> => {
  const userId = user.uuid;
  if (isForumZentrale(user)) return 'all';
  if ((await findActivePiketShift(userId, ChatType.FORUM, now)) !== undefined) return 'all';
  const memberships = await prisma.chatMembership.findMany({
    where: {
      userId,
      chatPermission: { in: [ChatMembershipPermission.OWNER, ChatMembershipPermission.ADMIN] },
      chat: { type: ChatType.FORUM },
    },
    select: { chatId: true },
  });
  return memberships.map((membership) => membership.chatId);
};

interface AuditEntry {
  action: ForumAuditAction;
  post: { messageId: string; chatId: string; title: string };
  topicName: string;
  actor: { id: string; name: string };
  moderator: ForumModerator;
  commentId?: string | undefined;
  before?: Prisma.InputJsonValue | undefined;
  after?: Prisma.InputJsonValue | undefined;
  note?: string | undefined;
}

/**
 * Writes one entry of the forum protocol. Call it in the transaction of the change itself, so
 * there is no change without an entry and no entry for a change that was rolled back.
 */
export const recordForumAuditEvent = async (
  prisma: PrismaClientOrTransaction,
  entry: AuditEntry,
): Promise<void> => {
  const { moderator } = entry;
  await prisma.forumAuditEvent.create({
    data: {
      action: entry.action,
      chatId: entry.post.chatId,
      topicName: entry.topicName,
      messageId: entry.post.messageId,
      postTitle: entry.post.title,
      commentId: entry.commentId ?? null,
      actorId: entry.actor.id,
      actorName: entry.actor.name,
      capacity: moderator.capacity,
      ...(moderator.capacity === 'PIKET'
        ? {
            piketScheduleId: moderator.shift.scheduleId,
            shiftStart: moderator.shift.start,
            shiftEnd: moderator.shift.end,
          }
        : {}),
      ...(moderator.capacity === 'DELEGATE'
        ? {
            assignmentId: moderator.assignment.id,
            delegatedById: moderator.assignment.assignedById,
            delegatedByName: moderator.assignment.assignedByName,
          }
        : {}),
      ...(entry.before === undefined ? {} : { before: entry.before }),
      ...(entry.after === undefined ? {} : { after: entry.after }),
      note: entry.note ?? null,
    },
  });
};
