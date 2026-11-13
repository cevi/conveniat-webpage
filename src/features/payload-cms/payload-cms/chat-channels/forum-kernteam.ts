import { toFunktionIds } from '@/features/payload-cms/payload-cms/utils/funktionen';
import prisma from '@/lib/db/prisma';
import { publishMembershipRevoked } from '@/lib/db/publish-membership-revoked';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/enums';
import type { Payload, PayloadRequest } from 'payload';

/**
 * The Kernteam of a forum topic is whoever holds one of the functions editors picked for it,
 * e.g. "Ressortleitung Infrastruktur" for "Platz & Infrastruktur". They hold ADMIN in the
 * topic's chat, which is what moderating it and reaching its whole audience asks for, see
 * `resolveForumModerator`. Who holds a function is changed in Cevi.DB and arrives with the
 * function sync, so the Kernteam follows it without an editor. The topic's OWNER, the editor
 * who created it, is left alone.
 */

/**
 * What someone holds who becomes Kernteam of a topic: ADMIN, and a subscription to every new
 * post of it, as the piket has during a shift. Set when they become Kernteam, so one who mutes
 * the topic afterwards stays muted.
 */
const KERNTEAM_MEMBERSHIP = (): {
  chatPermission: ChatMembershipPermission;
  subscribedAt: Date;
} => ({ chatPermission: ChatMembershipPermission.ADMIN, subscribedAt: new Date() });

/** Most topics the forum will have; far more than it will ever have. */
const MAX_TOPICS = 1000;

/**
 * Makes the ADMINs of a topic's chat exactly the holders of its Kernteam functions: a holder
 * becomes ADMIN, joining the chat if needed, and an ADMIN who no longer holds one becomes an
 * ordinary member, whom the audience sync then removes if they are not in the audience either.
 *
 * @returns how many ADMINs became members
 */
export const syncForumKernteam = async (
  chatUuid: string,
  funktionIds: string[],
): Promise<number> => {
  const holders =
    funktionIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { funktionIds: { hasSome: funktionIds } },
          select: { uuid: true },
        });
  const kernteam = new Set(holders.map((holder) => holder.uuid));
  const memberships = await prisma.chatMembership.findMany({
    where: { chatId: chatUuid },
    select: { userId: true, chatPermission: true },
  });
  const permissionOf = new Map(memberships.map((m) => [m.userId, m.chatPermission]));

  const promoted = [...kernteam].filter((userId) => {
    const permission = permissionOf.get(userId);
    return (
      permission !== ChatMembershipPermission.OWNER && permission !== ChatMembershipPermission.ADMIN
    );
  });
  for (const userId of promoted) {
    await prisma.chatMembership.upsert({
      where: { userId_chatId: { userId, chatId: chatUuid } },
      create: { userId, chatId: chatUuid, ...KERNTEAM_MEMBERSHIP() },
      update: KERNTEAM_MEMBERSHIP(),
    });
  }

  const demoted = memberships
    .filter((m) => m.chatPermission === ChatMembershipPermission.ADMIN && !kernteam.has(m.userId))
    .map((m) => m.userId);
  if (demoted.length > 0) {
    await prisma.chatMembership.updateMany({
      where: { chatId: chatUuid, userId: { in: demoted } },
      data: { chatPermission: ChatMembershipPermission.MEMBER },
    });
  }
  if (promoted.length > 0 || demoted.length > 0) await syncConversationKernteam(chatUuid);
  return demoted.length;
};

/**
 * Makes the ADMINs of every open private conversation of a topic its Kernteam now, or of one
 * conversation with `conversationId`, e.g. when it opens again: a new Kernteam member joins it
 * and follows its answers, unless they switched those pushes off, and one who left the Kernteam
 * leaves it and stops following it, unless they wrote it. Their open pages are told at once,
 * since the stream checks a membership only when it connects. Closed conversations keep who
 * answered them, until they open again.
 */
export const syncConversationKernteam = async (
  topicChatId: string,
  conversationId?: string,
): Promise<void> => {
  const [kernteam, conversations] = await Promise.all([
    prisma.chatMembership.findMany({
      where: {
        chatId: topicChatId,
        chatPermission: { in: [ChatMembershipPermission.OWNER, ChatMembershipPermission.ADMIN] },
      },
      select: { userId: true, forumConversationPushOff: true },
    }),
    prisma.chat.findMany({
      where: {
        forumTopicId: topicChatId,
        type: ChatType.FORUM_CONVERSATION,
        status: 'OPEN',
        ...(conversationId === undefined ? {} : { uuid: conversationId }),
      },
      select: {
        uuid: true,
        chatMemberships: { select: { userId: true, chatPermission: true } },
        forumPosts: { select: { messageId: true, message: { select: { senderId: true } } } },
      },
    }),
  ]);
  const kernteamIds = new Set(kernteam.map((member) => member.userId));
  for (const conversation of conversations) {
    const post = conversation.forumPosts[0];
    const writer = post?.message.senderId ?? null;
    const joined: string[] = [];
    for (const member of kernteam) {
      if (member.userId === writer) continue;
      const current = conversation.chatMemberships.find((m) => m.userId === member.userId);
      if (current?.chatPermission === ChatMembershipPermission.ADMIN) continue;
      await prisma.chatMembership.upsert({
        where: { userId_chatId: { userId: member.userId, chatId: conversation.uuid } },
        create: {
          userId: member.userId,
          chatId: conversation.uuid,
          chatPermission: ChatMembershipPermission.ADMIN,
          mutedAt: member.forumConversationPushOff ? new Date() : null,
        },
        update: { chatPermission: ChatMembershipPermission.ADMIN },
      });
      if (!member.forumConversationPushOff) joined.push(member.userId);
    }
    // the answers reach the Kernteam through the post's subscriptions, as they did at its start
    if (post !== undefined && joined.length > 0) {
      await prisma.threadSubscription.createMany({
        data: joined.map((userId) => ({ userId, messageId: post.messageId })),
        skipDuplicates: true,
      });
    }
    const departed = conversation.chatMemberships
      .filter(
        (m) =>
          m.chatPermission === ChatMembershipPermission.ADMIN &&
          !kernteamIds.has(m.userId) &&
          m.userId !== writer,
      )
      .map((m) => m.userId);
    if (departed.length === 0) continue;
    await prisma.chatMembership.deleteMany({
      where: { chatId: conversation.uuid, userId: { in: departed } },
    });
    if (post !== undefined) {
      await prisma.threadSubscription.deleteMany({
        where: { messageId: post.messageId, userId: { in: departed } },
      });
    }
    await Promise.all(
      departed.map((userId) => publishMembershipRevoked(userId, conversation.uuid, userId)),
    );
  }
};

/**
 * Brings one person's Kernteam status in every forum topic in line with the functions they hold
 * now, after those changed. A former Kernteam member stays an ordinary member until the next
 * sync of the topic's audience, at their next login at the latest.
 */
export const syncForumKernteamOfUser = async (
  payload: Payload,
  userId: string,
  funktionIds: string[],
  request?: PayloadRequest,
): Promise<void> => {
  const { docs } = await payload.find({
    collection: 'forum-topics',
    depth: 0,
    limit: MAX_TOPICS,
    pagination: false,
    overrideAccess: true,
    select: { chatUuid: true, kernteamFunktionen: true },
    ...(request === undefined ? {} : { req: request }),
  });
  const held = new Set(funktionIds);
  for (const topic of docs) {
    if (typeof topic.chatUuid !== 'string' || topic.chatUuid === '') continue;
    const isKernteam = toFunktionIds(topic.kernteamFunktionen).some((id) => held.has(id));
    const membership = await prisma.chatMembership.findUnique({
      where: { userId_chatId: { userId, chatId: topic.chatUuid } },
      select: { chatPermission: true },
    });
    const permission = membership?.chatPermission;
    if (permission === ChatMembershipPermission.OWNER) continue;
    if (isKernteam && permission !== ChatMembershipPermission.ADMIN) {
      await prisma.chatMembership.upsert({
        where: { userId_chatId: { userId, chatId: topic.chatUuid } },
        create: { userId, chatId: topic.chatUuid, ...KERNTEAM_MEMBERSHIP() },
        update: KERNTEAM_MEMBERSHIP(),
      });
      await syncConversationKernteam(topic.chatUuid);
    } else if (!isKernteam && permission === ChatMembershipPermission.ADMIN) {
      await prisma.chatMembership.update({
        where: { userId_chatId: { userId, chatId: topic.chatUuid } },
        data: { chatPermission: ChatMembershipPermission.MEMBER },
      });
      await syncConversationKernteam(topic.chatUuid);
    }
  }
};
