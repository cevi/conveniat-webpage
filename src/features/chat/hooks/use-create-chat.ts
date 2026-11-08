'use client';
import { toast } from '@/components/ui/toast';
import type { Contact } from '@/features/chat/api/queries/list-contacts';
import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { generateChatId, generateMessageId } from '@/features/chat/utils';
import { markChatCreation } from '@/features/chat/utils/chat-creation-state';
import { addMessageToOutbox } from '@/features/chat/utils/offline-outbox';
import { isRateLimitError } from '@/features/chat/utils/send-errors';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import {
  ChatCapability,
  ChatMembershipPermission,
  ChatStatus,
  ChatType,
  MessageEventType,
  MessageType,
} from '@/lib/prisma/enums';
import { useTRPC } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { isTransportError, userErrorMessage } from '@/utils/user-error-message';
import type { InfiniteData } from '@tanstack/react-query';
import type { inferProcedureOutput } from '@trpc/server';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type InfiniteMessagesOutput = inferProcedureOutput<AppRouter['chat']['infiniteMessages']>;
type InfiniteMessagesData = InfiniteData<InfiniteMessagesOutput, string | null>;

/** Mirrors the system message `createNewChat` stores as the first message of every chat. */
const newChatCreatedText: StaticTranslationString = {
  de: 'Neuer Chat erstellt',
  en: 'New Chat created',
  fr: 'Nouveau chat créé',
};

const createChatFailedText: StaticTranslationString = {
  de: 'Der Chat konnte nicht erstellt werden.',
  en: 'The chat could not be created.',
  fr: 'Le chat n’a pas pu être créé.',
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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: currentUserId } = useQuery(trpc.chat.user.queryOptions({}));

  /**
   * Drops an optimistic chat that never made it to the server (or that the server
   * answered with a different, already existing chat).
   */
  const discardOptimisticChat = useCallback(
    (chatId: string): void => {
      queryClient.setQueryData(trpc.chat.chats.queryKey({}), (oldChats) =>
        oldChats?.filter((c) => c.id !== chatId),
      );
      // removed, not set to undefined: `setQueryData` ignores an updater that returns undefined
      queryClient.removeQueries(trpc.chat.chatDetails.queryFilter({ chatId }));
      queryClient.removeQueries(trpc.chat.infiniteMessages.infiniteQueryFilter({ chatId }));
    },
    [queryClient, trpc],
  );

  const { mutate } = useMutation(
    trpc.chat.createChat.mutationOptions({
      onError: (error, variables) => {
        const optimisticChatId = variables.chatId;
        if (
          (isTransportError(error) || isRateLimitError(error)) &&
          optimisticChatId !== undefined
        ) {
          // Keep the seeded caches in place: the chat stays open and writable, and the
          // outbox replays the creation (under the very same id) once we are back online,
          // or once the rate limit lets this user create chats again.
          addMessageToOutbox({
            type: 'CREATE_CHAT',
            id: optimisticChatId,
            chatName: variables.chatName,
            memberIds: variables.members.map((m) => m.userId),
            createdAt: new Date().toISOString(),
            userId: currentUserId,
          });
          // the chat's first line says it is still waiting, the way a queued message's clock does
          if (isTransportError(error))
            markChatCreation({ trpc, queryClient }, optimisticChatId, 'pending');
          return;
        }

        console.error('Failed to create chat:', error);
        toast.error(userErrorMessage(error, locale, chatErrorTexts, createChatFailedText));

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
        void queryClient
          .invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId: createdChatId }))
          .catch(console.warn);
        void queryClient
          .invalidateQueries(
            trpc.chat.infiniteMessages.infiniteQueryFilter({ chatId: createdChatId }),
          )
          .catch(console.warn);
        void queryClient.refetchQueries(trpc.chat.chats.pathFilter()).catch(console.warn);
      },
    }),
  );

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

      // nothing cached: a list of only this chat would hide the others until it is stale
      queryClient.setQueryData(trpc.chat.chats.queryKey({}), (oldChats) =>
        oldChats === undefined ? oldChats : [optimisticChat, ...oldChats],
      );

      // Seeded so that opening `/app/chat/<chatId>` right away renders the chat instead of
      // the "you need to be online" placeholder - the query for a chat the server does not
      // know yet either fails or is paused, and either way keeps this cached data.
      const optimisticDetails: ChatDetails = {
        id: chatId,
        name: displayName,
        type: chatType,
        status: ChatStatus.OPEN,
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
      queryClient.setQueryData(trpc.chat.chatDetails.queryKey({ chatId }), optimisticDetails);

      queryClient.setQueryData(
        trpc.chat.infiniteMessages.infiniteQueryKey({
          chatId,
          limit: CHAT_PAGE_SIZE,
          parentId: undefined,
        }),
        (): InfiniteMessagesData => ({
          pages: [{ items: [systemMessage], nextCursor: undefined }],
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
    [currentUserId, mutate, queryClient, trpc],
  );

  return { createChat };
};
