import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import prisma from '@/lib/database';
import { ChatMembershipPermission, MessageEventType, MessageType } from '@prisma/client';
import type { CollectionAfterChangeHook } from 'payload';

export const syncOrganisers: CollectionAfterChangeHook<CampScheduleEntry> = async ({ doc }) => {
  const courseId = doc.id;

  // Normalize organisers to string IDs
  const organisers = doc.organiser || [];
  const organiserIds = new Set(organisers.map((org) => (typeof org === 'string' ? org : org.id)));

  // Find the course chat
  const chat = await prisma.chat.findUnique({
    where: { courseId },
    include: {
      chatMemberships: true,
    },
  });

  if (!chat) return;

  // Get all enrolled users
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });
  const enrolledUserIds = new Set(enrollments.map((enrollment) => enrollment.userId));

  // 1. Handle New Organisers (Ensure they are ADMIN)
  for (const orgId of organiserIds) {
    const existingMembership = chat.chatMemberships.find((m) => m.userId === orgId);

    if (!existingMembership) {
      // Add as ADMIN
      await prisma.chatMembership.create({
        data: {
          userId: orgId,
          chatId: chat.uuid,
          chatPermission: ChatMembershipPermission.ADMIN,
        },
      });

      // System message
      const user = await prisma.user.findUnique({
        where: { uuid: orgId },
        select: { name: true },
      });
      if (user) {
        await prisma.message.create({
          data: {
            chatId: chat.uuid,
            type: MessageType.SYSTEM_MSG,
            contentVersions: {
              create: [{ payload: user.name + ' joined as admin' }],
            },
            messageEvents: {
              create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
            },
          },
        });
      }
    } else if (
      existingMembership.chatPermission !== ChatMembershipPermission.OWNER &&
      existingMembership.chatPermission !== ChatMembershipPermission.ADMIN
    ) {
      // Upgrade to ADMIN
      await prisma.chatMembership.update({
        where: {
          userId_chatId: {
            userId: orgId,
            chatId: chat.uuid,
          },
        },
        data: { chatPermission: ChatMembershipPermission.ADMIN },
      });
    }
  }

  // 2. Handle Removed Organisers (Downgrade or Remove)
  for (const membership of chat.chatMemberships) {
    if (organiserIds.has(membership.userId)) continue; // Still an organiser
    if (membership.chatPermission === ChatMembershipPermission.OWNER) continue; // Don't demote owner

    const isEnrolled = enrolledUserIds.has(membership.userId);

    if (isEnrolled) {
      // Downgrade to GUEST if currently ADMIN
      if (membership.chatPermission === ChatMembershipPermission.ADMIN) {
        await prisma.chatMembership.update({
          where: {
            userId_chatId: {
              userId: membership.userId,
              chatId: chat.uuid,
            },
          },
          data: { chatPermission: ChatMembershipPermission.GUEST },
        });
      }
    } else {
      // Remove from chat
      await prisma.chatMembership.delete({
        where: {
          userId_chatId: {
            userId: membership.userId,
            chatId: chat.uuid,
          },
        },
      });

      // System message for leaving
      const user = await prisma.user.findUnique({
        where: { uuid: membership.userId },
        select: { name: true },
      });
      if (user) {
        await prisma.message.create({
          data: {
            chatId: chat.uuid,
            type: MessageType.SYSTEM_MSG,
            contentVersions: {
              create: [{ payload: user.name + ' left the group' }],
            },
            messageEvents: {
              create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
            },
          },
        });
      }
    }
  }

  // Update chat timestamp
  await prisma.chat.update({
    where: { uuid: chat.uuid },
    data: { lastUpdate: new Date() },
  });
};
