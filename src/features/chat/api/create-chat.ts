'use server';

import type { Contact } from '@/features/chat/api/get-contacts';
import prisma from '@/features/chat/database';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import { z } from 'zod';

const contactSchema = z.object({
  uuid: z.string().regex(/^[0-9a-f]{24}$/, 'Invalid chat ID format.'),
});

const createChatSchema = z.object({
  members: z
    .array(contactSchema)
    .min(1, 'A chat must have at least one member besides the creator.'),
  chatName: z.string().optional(),
});

// eslint-disable-next-line complexity
export const createChat = async (
  members: Contact[],
  chatName: string | undefined,
): Promise<void> => {
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;

  if (user === undefined) {
    throw new Error('User not authenticated');
  }

  // 1. Validate inputs using Zod
  const validationResult = createChatSchema.safeParse({ members, chatName });

  if (!validationResult.success) {
    console.error('Input validation failed:', validationResult.error.errors);
    throw new Error('Invalid input data.');
  }

  const validatedData = validationResult.data;
  const validatedMembers = validatedData.members;
  const validatedChatName = validatedData.chatName;

  // 2. Validate that the current user is not in the list of members
  const isCurrentUserInMembers = validatedMembers.some((member) => member.uuid === user.uuid);

  if (isCurrentUserInMembers) {
    throw new Error('Cannot include the current user in the members list.');
  }

  // 3. Validate chat members: check for duplicates
  const memberUuids = validatedMembers.map((member) => member.uuid);
  const uniqueMemberUuids = new Set(memberUuids);
  if (uniqueMemberUuids.size !== memberUuids.length) {
    throw new Error('Duplicate members are not allowed in the chat.');
  }

  // 4. Validate chat name based on members count
  if (validatedMembers.length === 1) {
    if (validatedChatName !== undefined && validatedChatName.trim() !== '') {
      throw new Error('Private chats (with only one other member) cannot have a name.');
    }
    validatedData.chatName = ''; // Set to empty string for private chats
  } else {
    if (validatedChatName === undefined || validatedChatName.trim() === '') {
      throw new Error('Group chats must have a name.');
    }
    validatedData.chatName = validatedChatName.trim();
  }

  try {
    await prisma.chat.create({
      data: {
        name: validatedData.chatName,
        messages: {
          create: {
            content: 'New chat created',
            type: MessageType.SYSTEM,
            messageEvents: {
              create: {
                eventType: MessageEventType.CREATED,
              },
            },
          },
        },
        chatMemberships: {
          create: [
            { user: { connect: { uuid: user.uuid } } },
            ...validatedMembers.map((member) => ({
              user: { connect: { uuid: member.uuid } },
            })),
          ],
        },
      },
    });
  } catch (error) {
    console.error('Error creating chat in database:', error);
    throw new Error('Failed to create chat.');
  }
};
