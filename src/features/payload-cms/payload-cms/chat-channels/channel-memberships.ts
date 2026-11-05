import type { ChannelAudience } from '@/features/payload-cms/payload-cms/chat-channels/channel-audience';
import { findAudienceUserIds } from '@/features/payload-cms/payload-cms/chat-channels/channel-audience';
import { CHANNEL_COLLECTIONS } from '@/features/payload-cms/payload-cms/chat-channels/channel-collections';
import prisma from '@/lib/db/prisma';
import { publishMembershipRevoked } from '@/lib/db/publish-membership-revoked';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import type { Payload, PayloadRequest } from 'payload';

/** Options of `syncChannelMemberships`. */
export interface SyncChannelMembershipsOptions {
  /** What the audience holds in the chat, e.g. GUEST in an announcement channel. */
  memberPermission: ChatMembershipPermission;
  req?: PayloadRequest;
  /** Who removed the members, for their open streams; each removed member if unset. */
  actorId?: string | undefined;
}

/**
 * Reconciles the memberships of a channel's chat with its audience: adds whoever belongs to it
 * with `memberPermission` and removes whoever no longer does. Owners and admins stay.
 */
export const syncChannelMemberships = async (
  payload: Payload,
  chatUuid: string,
  audience: ChannelAudience,
  { memberPermission, req, actorId }: SyncChannelMembershipsOptions,
): Promise<void> => {
  const eligibleUserUuids = new Set(await findAudienceUserIds(payload, audience, req));

  // Fetch existing PostgreSQL memberships for this chat
  const existingMemberships = await prisma.chatMembership.findMany({
    where: { chatId: chatUuid },
  });

  const existingUserUuids = new Set(existingMemberships.map((m) => m.userId));

  // Add missing members
  // eslint-disable-next-line unicorn/prefer-spread
  const membersToAdd = Array.from(eligibleUserUuids).filter((uuid) => !existingUserUuids.has(uuid));
  if (membersToAdd.length > 0) {
    // Only synchronize users who actually exist in the PostgreSQL User table to avoid foreign key violations.
    const existingPostgresUsers = await prisma.user.findMany({
      where: {
        uuid: { in: membersToAdd },
      },
      select: {
        uuid: true,
      },
    });
    const existingPostgresUserUuids = new Set(existingPostgresUsers.map((u) => u.uuid));
    const validMembersToAdd = membersToAdd.filter((uuid) => existingPostgresUserUuids.has(uuid));

    if (validMembersToAdd.length > 0) {
      await prisma.chatMembership.createMany({
        data: validMembersToAdd.map((uuid) => ({
          chatId: chatUuid,
          userId: uuid,
          chatPermission: memberPermission,
        })),
      });
    }
  }

  // Remove users who are no longer eligible (excluding OWNER/ADMIN)
  const membersToRemove = existingMemberships.filter((m) => {
    if (
      m.chatPermission === ChatMembershipPermission.OWNER ||
      m.chatPermission === ChatMembershipPermission.ADMIN
    ) {
      return false;
    }
    return !eligibleUserUuids.has(m.userId);
  });

  if (membersToRemove.length > 0) {
    await prisma.chatMembership.deleteMany({
      where: {
        chatId: chatUuid,
        userId: { in: membersToRemove.map((m) => m.userId) },
      },
    });

    // Written outside a transaction, so the deletion is already committed here.
    await Promise.all(
      membersToRemove.map((m) => publishMembershipRevoked(m.userId, chatUuid, actorId ?? m.userId)),
    );
  }
};

/** Most channels of one collection the camp will have; far more than it will ever have. */
const MAX_CHANNELS = 1000;

/**
 * Brings every AVP channel up to date with the Höfe. Whether someone is an AVP depends on the
 * Höfe as much as on their own groups, so a Hof that is added or removed changes the members
 * of these channels without anyone saving them or logging in.
 *
 * @returns how many channels were brought up to date
 */
export const resyncAvpChannels = async (
  payload: Payload,
  request?: PayloadRequest,
): Promise<number> => {
  let synced = 0;
  for (const { slug, memberPermission } of CHANNEL_COLLECTIONS) {
    const { docs } = await payload.find({
      collection: slug,
      where: { targetType: { equals: 'avps' } },
      depth: 0,
      limit: MAX_CHANNELS,
      pagination: false,
      overrideAccess: true,
      select: { targetType: true, chatUuid: true },
      ...(request === undefined ? {} : { req: request }),
    });
    for (const channel of docs) {
      if (typeof channel.chatUuid !== 'string' || channel.chatUuid === '') continue;
      await syncChannelMemberships(payload, channel.chatUuid, channel, {
        memberPermission,
        ...(request === undefined ? {} : { req: request }),
      });
      synced += 1;
    }
  }
  return synced;
};
