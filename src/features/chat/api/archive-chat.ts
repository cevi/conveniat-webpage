'use server';

import prisma from '@/features/chat/database';
import { ChatMembershipPermission } from '@/lib/prisma';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import { MessageType } from '@prisma/client';

export const archiveChat = async (
  chatId: string,
): Promise<{
  success: boolean;
}> => {
  const session = await auth();
  const user = session?.user as unknown as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated.');
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Validate that the user is a member of the chat and has sufficient permissions
      const chat = await tx.chat.findUnique({
        where: {
          uuid: chatId,
        },
        select: {
          chatMemberships: true,
        },
      });

      if (
        !chat ||
        chat.chatMemberships.length === 0 ||
        !chat.chatMemberships.some((membership) => membership.userId === user.uuid)
      ) {
        console.warn(
          `User ${user.uuid} attempted to archive chat ${chatId} they are not a member of.`,
        );
        throw new Error('You are not a member of this chat.');
      }

      const userMembership = chat.chatMemberships.find(
        (membership) => membership.userId === user.uuid,
      );

      // Check if userMembership exists and if the user has OWNER or ADMIN permission
      if (
        !userMembership ||
        (userMembership.chatPermission !== ChatMembershipPermission.OWNER &&
          userMembership.chatPermission !== ChatMembershipPermission.ADMIN)
      ) {
        console.warn(
          `User ${user.uuid} does not have sufficient permission to archive chat ${chatId}. Current permission: ${userMembership?.chatPermission}.`,
        );
        throw new Error(
          'You do not have permission to archive this chat. Only owners or admins can archive a chat.',
        );
      }

      // 2. Set the userMembership's hasDeleted flag to true
      await tx.chatMembership.update({
        where: {
          userId_chatId: {
            chatId: chatId,
            userId: user.uuid,
          },
        },
        data: {
          hasDeleted: true,
        },
      });

      // check if the chat is already archived
      const isChatArchived = await tx.chat.findUnique({
        where: {
          uuid: chatId,
        },
        select: {
          isArchived: true,
        },
      });

      if (isChatArchived?.isArchived === true) {
        console.warn(`Chat ${chatId} is already archived.`);
        return;
      }

      // 3. Archive the chat (delete it)
      await tx.chat.update({
        where: {
          uuid: chatId,
        },
        data: {
          isArchived: true,
        },
      });

      // 4. Send a system message in the chat indicating it has been archived
      await tx.message.create({
        data: {
          content: 'This chat has been archived by the owner or an admin.',
          type: MessageType.SYSTEM,
          chat: {
            connect: {
              uuid: chatId,
            },
          },
          messageEvents: {
            create: {
              eventType: 'CREATED',
            },
          },
        },
      });

      console.log(`Chat ${chatId} archived successfully by user ${user.uuid}.`);
    });

    return { success: true };
  } catch (error) {
    console.error('Error archiving chat:', error);
    // Re-throw specific errors for client-side handling if needed
    throw error instanceof Error &&
      (error.message === 'User not authenticated.' ||
        error.message === 'You are not a member of this chat.' ||
        error.message ===
          'You do not have permission to archive this chat. Only owners or admins can archive a chat.')
      ? error
      : new Error('Failed to archive chat.');
  }
};
