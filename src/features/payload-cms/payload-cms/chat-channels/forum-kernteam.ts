import { toFunktionIds } from '@/features/payload-cms/payload-cms/utils/funktionen';
import prisma from '@/lib/db/prisma';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import type { Payload, PayloadRequest } from 'payload';

/**
 * The Kernteam of a forum topic is whoever holds one of the functions editors picked for it,
 * e.g. "Ressortleitung Infrastruktur" for "Platz & Infrastruktur". They hold ADMIN in the
 * topic's chat, which is what moderating it and reaching its whole audience asks for, see
 * `resolveForumModerator`. Who holds a function is changed in Cevi.DB and arrives with the
 * function sync, so the Kernteam follows it without an editor. The topic's OWNER, the editor
 * who created it, is left alone.
 */

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
      create: { userId, chatId: chatUuid, chatPermission: ChatMembershipPermission.ADMIN },
      update: { chatPermission: ChatMembershipPermission.ADMIN },
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
  return demoted.length;
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
        create: { userId, chatId: topic.chatUuid, chatPermission: ChatMembershipPermission.ADMIN },
        update: { chatPermission: ChatMembershipPermission.ADMIN },
      });
    } else if (!isKernteam && permission === ChatMembershipPermission.ADMIN) {
      await prisma.chatMembership.update({
        where: { userId_chatId: { userId, chatId: topic.chatUuid } },
        data: { chatPermission: ChatMembershipPermission.MEMBER },
      });
    }
  }
};
