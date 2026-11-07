import { getActivePiketMembers } from '@/features/chat/api/utils/piket-service';
import prisma from '@/lib/db/prisma';
import { forumPostPath } from '@/lib/forum-shared';
import { ChatType, PushNotificationKind } from '@/lib/prisma/enums';
import { sendNotification } from '@/lib/push/send-notification';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('forum:push');

/**
 * Who hears about what in the forum. Everything here runs after the commit, on the pool, and
 * never throws: the change is stored, only its push may be lost. Muting a topic silences all of
 * it, piket duty included, because `sendNotification` drops whoever muted the chat.
 *
 * | event                      | recipients                                   |
 * | -------------------------- | -------------------------------------------- |
 * | post by a member           | topic subscribers, piket on duty             |
 * | post by the topic's admins | the topic's whole audience                   |
 * | comment                    | subscribers of the post, piket on duty       |
 * | status change, assignment  | subscribers of the post                      |
 * | private report             | the topic's admins, piket on duty            |
 */

const activePiketIds = async (): Promise<string[]> => {
  const members = await getActivePiketMembers(ChatType.FORUM).catch((error: unknown) => {
    logger.error('Failed to read the forum piket on duty', { error });
    return [];
  });
  return members.map((member) => member.id);
};

const without = (ids: Iterable<string>, excluded: string): string[] =>
  [...new Set(ids)].filter((id) => id !== excluded);

interface ForumPush {
  chatId: string;
  postId: string;
  /** the comment or post the push is about, so a client that has it already drops the push */
  messageId?: string;
  title: string;
  text: string;
  senderName?: string;
  kind: PushNotificationKind;
  recipientIds: string[];
}

const send = async (push: ForumPush): Promise<void> => {
  logger.debug('Forum push fan-out', {
    'chat.id': push.chatId,
    'forum.post.id': push.postId,
    'push.kind': push.kind,
    'push.recipient.count': push.recipientIds.length,
  });
  if (push.recipientIds.length === 0) return;
  await sendNotification(push.text, push.recipientIds, push.chatId, push.messageId, {
    kind: push.kind,
    chatName: push.title,
    ...(push.senderName === undefined ? {} : { senderName: push.senderName }),
    path: forumPostPath(push.postId),
  });
};

const settle = (promise: Promise<void>, context: Record<string, string>): void => {
  promise.catch((error: unknown) => {
    logger.error('Failed to send a forum push', { error, ...context });
  });
};

/** A new post: to the whole audience when the topic's admins wrote it, else to who follows. */
export const pushNewForumPost = (post: {
  chatId: string;
  postId: string;
  title: string;
  text: string;
  topicName: string;
  senderId: string;
  senderName: string;
  byTopicAdmin: boolean;
}): void => {
  const run = async (): Promise<void> => {
    if (post.byTopicAdmin) {
      const audience = await prisma.chatMembership.findMany({
        where: { chatId: post.chatId, hasDeleted: false, userId: { not: post.senderId } },
        select: { userId: true },
      });
      await send({
        chatId: post.chatId,
        postId: post.postId,
        messageId: post.postId,
        title: `${post.topicName}: ${post.title}`,
        text: post.text,
        senderName: post.senderName,
        kind: PushNotificationKind.ANNOUNCEMENT,
        recipientIds: audience.map((membership) => membership.userId),
      });
      return;
    }

    const [subscribers, piketIds] = await Promise.all([
      prisma.chatMembership.findMany({
        where: { chatId: post.chatId, subscribedAt: { not: null }, hasDeleted: false },
        select: { userId: true },
      }),
      activePiketIds(),
    ]);
    const piket = new Set(without(piketIds, post.senderId));
    // the piket hears it as a report, on the support channel; the others as a forum post
    await send({
      chatId: post.chatId,
      postId: post.postId,
      messageId: post.postId,
      title: `${post.topicName}: ${post.title}`,
      text: post.text,
      senderName: post.senderName,
      kind: PushNotificationKind.SUPPORT,
      recipientIds: [...piket],
    });
    await send({
      chatId: post.chatId,
      postId: post.postId,
      messageId: post.postId,
      title: `${post.topicName}: ${post.title}`,
      text: post.text,
      senderName: post.senderName,
      kind: PushNotificationKind.CHAT,
      recipientIds: without(
        subscribers.map((membership) => membership.userId),
        post.senderId,
      ).filter((id) => !piket.has(id)),
    });
  };
  settle(run(), { 'chat.id': post.chatId, 'forum.post.id': post.postId });
};

/**
 * A post only its moderators see, the topic's Kernteam and the piket on duty: one waiting for
 * approval, whose other pushes wait for it (see `approveForumPost`), or a private report.
 */
export const pushForumModerators = (post: {
  chatId: string;
  postId: string;
  title: string;
  /** in the author's language, like every push */
  text: string;
  topicName: string;
  senderId: string;
  senderName: string;
}): void => {
  const run = async (): Promise<void> => {
    const [admins, piketIds] = await Promise.all([
      prisma.chatMembership.findMany({
        where: { chatId: post.chatId, chatPermission: { in: ['OWNER', 'ADMIN'] } },
        select: { userId: true },
      }),
      activePiketIds(),
    ]);
    await send({
      chatId: post.chatId,
      postId: post.postId,
      title: post.topicName,
      text: post.text,
      senderName: post.senderName,
      kind: PushNotificationKind.SUPPORT,
      recipientIds: without(
        [...admins.map((membership) => membership.userId), ...piketIds],
        post.senderId,
      ),
    });
  };
  settle(run(), { 'chat.id': post.chatId, 'forum.post.id': post.postId });
};

/**
 * Something happened in a post's thread: a comment, a status change, an assignment. Goes to the
 * post's subscribers, and for a comment to the piket on duty as well.
 */
export const pushForumThread = (event: {
  chatId: string;
  postId: string;
  messageId?: string;
  postTitle: string;
  text: string;
  actorId: string;
  senderName?: string;
  includePiket: boolean;
}): void => {
  const run = async (): Promise<void> => {
    const [subscriptions, piketIds] = await Promise.all([
      prisma.threadSubscription.findMany({
        where: { messageId: event.postId },
        select: { userId: true },
      }),
      event.includePiket ? activePiketIds() : Promise.resolve([]),
    ]);
    await send({
      chatId: event.chatId,
      postId: event.postId,
      ...(event.messageId === undefined ? {} : { messageId: event.messageId }),
      title: event.postTitle,
      text: event.text,
      ...(event.senderName === undefined ? {} : { senderName: event.senderName }),
      kind: PushNotificationKind.CHAT,
      recipientIds: without(
        [...subscriptions.map((subscription) => subscription.userId), ...piketIds],
        event.actorId,
      ),
    });
  };
  settle(run(), { 'chat.id': event.chatId, 'forum.post.id': event.postId });
};

/** A push to one person, the helper an assignment was handed to or withdrawn from. */
export const pushForumPerson = (event: {
  chatId: string;
  postId: string;
  postTitle: string;
  text: string;
  recipientId: string;
}): void => {
  settle(
    send({
      chatId: event.chatId,
      postId: event.postId,
      title: event.postTitle,
      text: event.text,
      kind: PushNotificationKind.CHAT,
      recipientIds: [event.recipientId],
    }),
    { 'chat.id': event.chatId, 'forum.post.id': event.postId },
  );
};
