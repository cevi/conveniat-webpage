'use client';

import type { Contact } from '@/features/chat/api/queries/list-contacts';
import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { dropCachedEntry, generateChatId, generateMessageId } from '@/features/chat/utils';
import { addMessageToOutbox } from '@/features/chat/utils/offline-outbox';
import { ChatCapability, ChatStatus, SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { StaticTranslationString } from '@/types/types';
import { ChatMembershipPermission, ChatType, MessageEventType, MessageType } from '@prisma/client';
import type { InfiniteData } from '@tanstack/react-query';
import type { inferProcedureOutput } from '@trpc/server';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

type InfiniteMessagesOutput = inferProcedureOutput<AppRouter['chat']['infiniteMessages']>;
type InfiniteMessagesData = InfiniteData<InfiniteMessagesOutput, string | null>;

/** Mirrors the system message `createNewChat` stores as the first message of every chat. */
const newChatCreatedText: StaticTranslationString = {
  de: 'Neuer Chat erstellt',
  en: 'New Chat created',
  fr: 'Nouveau chat créé',
};

export interface CreateChatArguments {
  /** Group name; `undefined` for one-to-one chats, whose name is the other participant. */
  chatName: string | undefined;
  members: Contact[];
}

/**
 * Creates a chat under a client-generated id.
 *
 * The id is chosen on the client and sent along, so the caller can navigate straight into
 * the new chat instead of bouncing through the overview: the route it opens is the route
 * the chat keeps once the creation reaches the server. Everything the chat view reads —
 * the overview entry, the chat details and the first page of messages — is seeded into the
 * query cache up front, which is also what makes the chat usable while offline: the
 * creation is queued in the outbox, and messages typed into it are queued behind it.
 */
export const useCreateChat = (): {
  /** Seeds the optimistic chat, starts the creation and returns the new chat's id. */
  createChat: (arguments_: CreateChatArguments) => string;
} => {
  const trpcUtils = trpc.useUtils();
  const router = useRouter();
  const pathname = usePathname();
  const { data: currentUserId } = trpc.chat.user.useQuery({});

  /**
   * Drops an optimistic chat that never made it to the server (or that the server
   * answered with a different, already existing chat).
   */
  const discardOptimisticChat = useCallback(
    (chatId: string): void => {
      trpcUtils.chat.chats.setData({}, (oldChats) => oldChats?.filter((c) => c.id !== chatId));
      trpcUtils.chat.chatDetails.setData({ chatId }, dropCachedEntry);
      trpcUtils.chat.infiniteMessages.setInfiniteData(
        { chatId, limit: CHAT_PAGE_SIZE, parentId: undefined },
        dropCachedEntry,
      );
    },
    [trpcUtils],
  );

  const { mutate } = trpc.chat.createChat.useMutation({
    networkMode: 'always',

    onError: (error, variables) => {
      const optimisticChatId = variables.chatId;
      const isOfflineError =
        !navigator.onLine ||
        error.message === 'Failed to fetch' ||
        error.message.includes('Network request failed');

      if (isOfflineError && optimisticChatId !== undefined) {
        // Keep the seeded caches in place: the chat stays open and writable, and the
        // outbox replays the creation (under the very same id) once we are back online.
        addMessageToOutbox({
          type: 'CREATE_CHAT',
          id: optimisticChatId,
          chatName: variables.chatName,
          memberIds: variables.members.map((m) => m.userId),
          createdAt: new Date().toISOString(),
        });
        toast.success('Chat queued. Will be created when online.');
        return;
      }

      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat', error);

      if (optimisticChatId === undefined) return;
      discardOptimisticChat(optimisticChatId);

      // The user is already looking at a chat that will never exist - send them back.
      if (pathname.includes(optimisticChatId)) {
        router.replace('/app/chat');
      }
    },

    onSuccess: (createdChatId, variables) => {
      const optimisticChatId = variables.chatId;

      // The server answers a one-to-one creation with the *existing* private chat when
      // the two already have one, so the id we optimistically opened can differ from the
      // one that was actually stored. Drop the placeholder and follow the real chat.
      if (optimisticChatId !== undefined && optimisticChatId !== createdChatId) {
        discardOptimisticChat(optimisticChatId);
        if (pathname.includes(optimisticChatId)) {
          router.replace(`/app/chat/${createdChatId}`);
        }
      }

      // Replace the seeded placeholders with the server's version of the chat.
      void trpcUtils.chat.chatDetails.invalidate({ chatId: createdChatId }).catch(console.warn);
      void trpcUtils.chat.infiniteMessages
        .invalidate({ chatId: createdChatId })
        .catch(console.warn);
      void trpcUtils.chat.chats.refetch().catch(console.warn);
    },
  });

  const createChat = useCallback(
    ({ chatName, members }: CreateChatArguments): string => {
      const chatId = generateChatId();
      const createdAt = new Date();
      const isGroupChat = members.length > 1;
      const chatType = isGroupChat ? ChatType.GROUP : ChatType.ONE_TO_ONE;

      // One-to-one chats have no name of their own; the server resolves them to the other
      // participant's display name, which is exactly what `Contact.name` already holds.
      const displayName = isGroupChat ? (chatName ?? '') : (members[0]?.name ?? '');

      const systemMessage: ChatMessage = {
        id: generateMessageId(),
        createdAt,
        messagePayload: newChatCreatedText,
        senderId: undefined,
        status: MessageEventType.STORED,
        type: MessageType.SYSTEM_MSG,
      };

      const optimisticChat: ChatWithMessagePreview = {
        id: chatId,
        name: displayName,
        description: undefined,
        status: ChatStatus.OPEN,
        chatType,
        lastMessage: {
          id: systemMessage.id,
          senderId: SYSTEM_SENDER_ID,
          messagePreview: newChatCreatedText,
          createdAt,
          status: MessageEventType.STORED,
        },
        lastUpdate: createdAt,
        unreadCount: 0,
        messageCount: 1,
        userChatPermission: ChatMembershipPermission.OWNER,
      };

      trpcUtils.chat.chats.setData({}, (oldChats) => [optimisticChat, ...(oldChats ?? [])]);

      // Seeded so that opening `/app/chat/<chatId>` right away renders the chat instead of
      // the "you need to be online" placeholder - the query for a chat the server does not
      // know yet either fails or is paused, and either way keeps this cached data.
      const optimisticDetails: ChatDetails = {
        id: chatId,
        name: displayName,
        type: chatType,
        status: ChatStatus.OPEN,
        // eslint-disable-next-line unicorn/no-null
        archivedAt: null,
        messages: [systemMessage],
        participants: [
          ...(typeof currentUserId === 'string' && currentUserId !== ''
            ? [
                {
                  id: currentUserId,
                  name: '',
                  isOnline: true,
                  chatPermission: ChatMembershipPermission.OWNER,
                },
              ]
            : []),
          ...members.map((member) => ({
            id: member.userId,
            name: member.name,
            isOnline: false,
            chatPermission: ChatMembershipPermission.MEMBER,
            ...(member.description === undefined ? {} : { description: member.description }),
          })),
        ],
        capabilities: [
          ChatCapability.CAN_SEND_MESSAGES,
          ChatCapability.THREADS,
          ChatCapability.EMOJI_REACTIONS,
        ],
      };
      trpcUtils.chat.chatDetails.setData({ chatId }, optimisticDetails);

      trpcUtils.chat.infiniteMessages.setInfiniteData(
        { chatId, limit: CHAT_PAGE_SIZE, parentId: undefined },
        (): InfiniteMessagesData => ({
          pages: [{ items: [systemMessage], nextCursor: undefined }],
          // eslint-disable-next-line unicorn/no-null
          pageParams: [null],
        }),
      );

      mutate({
        chatId,
        chatName,
        members: members.map((member) => ({ userId: member.userId })),
      });

      return chatId;
    },
    [currentUserId, mutate, trpcUtils],
  );

  return { createChat };
};
