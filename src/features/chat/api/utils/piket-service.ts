import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import prisma from '@/lib/db/prisma';
import type { ChatType } from '@/lib/prisma/client';
import { ChatMembershipPermission, MessageEventType, MessageType } from '@/lib/prisma/client';
import config from '@payload-config';
import type { Payload } from 'payload';
import { getPayload } from 'payload';

export interface PiketMember {
  id: string;
  name: string;
}

interface PiketScheduleDocument {
  id: string;
  startTime: string;
  endTime: string;
  chatTypes: string[];
  users?:
    | Array<string | { id: string; fullName?: string }>
    | string
    | { id: string; fullName?: string }
    | null;
}

export async function getActivePiketMembers(
  chatType: ChatType,
  date: Date = new Date(),
): Promise<PiketMember[]> {
  const payload = await getPayload({ config });
  const dateString = date.toISOString();

  // Cast collection to 'never' to bypass CMS auto-types constraint cleanly without using 'any'
  const entriesResult = (await payload.find({
    collection: 'piket-schedules' as never,
    where: {
      and: [
        { startTime: { less_than_equal: dateString } },
        { endTime: { greater_than_equal: dateString } },
        { chatTypes: { contains: chatType } },
      ],
    },
    depth: 1,
  })) as unknown as { docs: PiketScheduleDocument[] };

  const entries = entriesResult.docs;
  const uniqueUsers = new Map<string, PiketMember>();

  for (const entry of entries) {
    const users = entry.users;
    if (users === null || users === undefined) {
      continue;
    }

    const usersList = Array.isArray(users) ? users : [users];

    for (const u of usersList) {
      if (typeof u === 'object') {
        uniqueUsers.set(u.id, {
          id: u.id,
          name: u.fullName !== undefined && u.fullName !== '' ? u.fullName : 'Piket Member',
        });
      } else {
        uniqueUsers.set(u, {
          id: u,
          name: 'Piket Member',
        });
      }
    }
  }

  return [...uniqueUsers.values()];
}

/**
 * Syncs currently active piket members to all matching open chats.
 * Note: Piket members are intentionally kept in the chat once added, even after their shift ends,
 * to ensure continuity of context and conversation history for the emergency/support ticket they responded to.
 */
export async function syncPiketMembersToOpenChats(payload: Payload): Promise<void> {
  const now = new Date();
  const dateString = now.toISOString();

  // Find all currently active schedules
  const activeSchedules = (await payload.find({
    collection: 'piket-schedules' as never,
    where: {
      and: [
        { startTime: { less_than_equal: dateString } },
        { endTime: { greater_than_equal: dateString } },
      ],
    },
    depth: 1,
    limit: 100,
  })) as unknown as { docs: PiketScheduleDocument[] };

  for (const schedule of activeSchedules.docs) {
    const users = schedule.users;
    if (users === null || users === undefined) {
      continue;
    }
    const chatTypes = schedule.chatTypes;
    if (chatTypes.length === 0) {
      continue;
    }

    const usersList = Array.isArray(users) ? users : [users];

    // Normalize user list
    const membersToSync: PiketMember[] = [];
    for (const u of usersList) {
      if (typeof u === 'object') {
        membersToSync.push({
          id: u.id,
          name: u.fullName !== undefined && u.fullName !== '' ? u.fullName : 'Piket Member',
        });
      } else if (typeof u === 'string') {
        membersToSync.push({
          id: u,
          name: 'Piket Member',
        });
      }
    }

    if (membersToSync.length === 0) {
      continue;
    }

    // Find all open chats matching the schedule target types
    const openChats = await prisma.chat.findMany({
      where: {
        status: 'OPEN',
        type: { in: chatTypes as ChatType[] },
      },
      include: {
        chatMemberships: true,
      },
    });

    for (const chat of openChats) {
      for (const member of membersToSync) {
        // Check if user is already a member
        const isMember = chat.chatMemberships.some((m) => m.userId === member.id);
        if (isMember) {
          continue;
        }

        // Upsert user in Postgres to satisfy foreign key constraints
        await prisma.user.upsert({
          where: { uuid: member.id },
          create: {
            uuid: member.id,
            name: member.name,
            lastSeen: new Date('1970-01-01T00:00:00Z'),
          },
          update: {
            name: member.name,
          },
        });

        // Add user to chat membership safely using upsert to avoid race conditions
        await prisma.chatMembership.upsert({
          where: {
            userId_chatId: {
              userId: member.id,
              chatId: chat.uuid,
            },
          },
          create: {
            chatId: chat.uuid,
            userId: member.id,
            chatPermission: ChatMembershipPermission.MEMBER,
          },
          update: {},
        });

        // Localized system message text (since background cron runs without locale context, default to German/English)
        const messageText = `${member.name} wurde automatisch hinzugefügt (Piket-Dienst)`;

        // Create system message
        const systemMessage = await prisma.message.create({
          data: {
            chatId: chat.uuid,
            type: MessageType.SYSTEM_MSG,
            contentVersions: {
              create: [
                {
                  payload: messageText,
                },
              ],
            },
            messageEvents: {
              create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
            },
          },
        });

        // Update chat last update
        await prisma.chat.update({
          where: { uuid: chat.uuid },
          data: { lastUpdate: new Date() },
        });

        // Publish new_message event via pub/sub so the UI refreshes instantly
        chatPubSub
          .publish({
            type: 'new_message',
            chatId: chat.uuid,
            senderId: SYSTEM_SENDER_ID,
            message: {
              id: systemMessage.uuid,
              createdAt: systemMessage.createdAt,
              messagePayload: messageText,
              senderId: SYSTEM_SENDER_ID,
              status: MessageEventType.STORED,
              type: MessageType.SYSTEM_MSG,
            },
          })
          .catch((error: unknown) => {
            console.error(
              'Failed to publish real-time member added event in background sync:',
              error,
            );
          });
      }
    }
  }
}
