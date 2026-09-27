import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { getMessagePreviewText } from '@/features/chat/api/utils/get-message-preview-text';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import {
  generateMessageId,
  mergeStoredMessage,
  mergeStoredMessageAcrossPages,
} from '@/features/chat/utils';
import { forgetFailedSend, rememberFailedSend } from '@/features/chat/utils/failed-sends';
import {
  addMessageToOutbox,
  removeMessageFromOutbox,
  setSendInFlight,
} from '@/features/chat/utils/offline-outbox';
import { ChatStatus, SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { ChatType, MessageEventType, MessageType } from '@/lib/prisma/client';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { InfiniteData } from '@tanstack/react-query';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCMutationResult } from '@trpc/react-query/shared';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

type UseMessageSendMutation = UseTRPCMutationResult<
  inferProcedureOutput<AppRouter['chat']['sendMessage']>,
  TRPCClientErrorLike<AppRouter>,
  inferProcedureInput<AppRouter['chat']['sendMessage']>,
  OptimisticUpdateResult
>;

type InfiniteMessagesOutput = inferProcedureOutput<AppRouter['chat']['infiniteMessages']>;
type InfiniteMessagesData = InfiniteData<InfiniteMessagesOutput, string | null>;

interface OptimisticUpdateResult {
  previousChatData: ChatDetails | undefined;
  previousInfiniteData: InfiniteMessagesData | undefined;
  optimisticMessageId?: string;
}

const performOptimisticMessageUpdate = async (
  trpcUtils: ReturnType<typeof trpc.useUtils>,
  currentUser: string | undefined,
  {
    chatId,
    content,
    type,
    quotedMessageId,
    parentId,
    messageId,
  }: {
    chatId: string;
    content: string;
    type: MessageType;
    quotedMessageId?: string | undefined;
    parentId?: string | undefined;
    messageId?: string | undefined;
  },
): Promise<OptimisticUpdateResult> => {
  await trpcUtils.chat.chatDetails.cancel({ chatId });
  await trpcUtils.chat.infiniteMessages.cancel({
    chatId,
    limit: CHAT_PAGE_SIZE,
    parentId: parentId ?? undefined,
  });

  const previousChatData = trpcUtils.chat.chatDetails.getData({ chatId });
  const previousInfiniteData = trpcUtils.chat.infiniteMessages.getInfiniteData({
    chatId,
    limit: CHAT_PAGE_SIZE,
    parentId: parentId ?? undefined,
  }) as InfiniteMessagesData | undefined;

  // Find quoted message text if quotedMessageId is provided
  let quotedSnippet: string | undefined;
  if (typeof quotedMessageId === 'string' && quotedMessageId.length > 0) {
    // Search in infinite data and details cache
    const messagesFromInfinite = previousInfiniteData?.pages.flatMap((page) => page.items) ?? [];
    const messagesFromDetails = previousChatData?.messages ?? [];
    const allCachedMessages = [...messagesFromInfinite, ...messagesFromDetails];

    const quotedMessage = allCachedMessages.find((m) => m.id === quotedMessageId);

    if (quotedMessage) {
      const payload = quotedMessage.messagePayload;
      let text: string;
      if (typeof payload === 'string') {
        text = payload;
      } else {
        const textPayload = payload as Record<string, unknown>;
        text =
          typeof textPayload['text'] === 'string' ? textPayload['text'] : JSON.stringify(payload);
      }
      quotedSnippet = text.length > 100 ? `${text.slice(0, 100)}...` : text;
    }
  }

  // eslint-disable-next-line unicorn/prefer-global-this
  const isOffline = typeof window !== 'undefined' && !navigator.onLine;

  const optimisticMessage: ChatMessage = {
    // `messageId` is the id the server was asked to persist, so the optimistic bubble and
    // the stored row share it and no id swap is needed once the send resolves
    id: messageId ?? generateMessageId(),
    // the same payload shape the server stores, see `createMessage`
    messagePayload:
      type === MessageType.IMAGE_MSG
        ? { url: content }
        : {
            text: content.trim(),
            ...(typeof quotedMessageId === 'string' &&
              quotedMessageId.length > 0 && { quotedMessageId, quotedSnippet }),
          },
    createdAt: new Date(),
    senderId: currentUser,
    status: MessageEventType.CREATED,
    type,
    parentId: parentId ?? undefined,
    isPendingOffline: isOffline,
  };

  // optimistically update the infinite messages
  trpcUtils.chat.infiniteMessages.setInfiniteData(
    { chatId, limit: CHAT_PAGE_SIZE, parentId: parentId ?? undefined },
    (data: InfiniteMessagesData | undefined): InfiniteMessagesData | undefined => {
      if (!data) {
        return {
          pages: [
            {
              items: [optimisticMessage],
              nextCursor: undefined,
            },
          ],
          // eslint-disable-next-line unicorn/no-null
          pageParams: [null],
        };
      }

      // a retry reuses the id of the failed bubble: turn that bubble back into a pending
      // one where it stands instead of adding a second copy
      const isRetry = data.pages.some((page) =>
        page.items.some((item) => item.id === optimisticMessage.id),
      );
      if (isRetry) {
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === optimisticMessage.id
                ? { ...optimisticMessage, createdAt: item.createdAt }
                : item,
            ),
          })),
        };
      }

      return {
        ...data,
        pages: data.pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              items: [optimisticMessage, ...page.items],
            };
          }
          return page;
        }),
      };
    },
  );

  // optimistically update the chat details if this is not a thread reply
  if (!parentId) {
    trpcUtils.chat.chatDetails.setData(
      { chatId },
      (oldData: ChatDetails | undefined): ChatDetails => {
        if (!oldData) {
          return {
            // eslint-disable-next-line unicorn/no-null
            archivedAt: null,
            name: '',
            participants: [],
            id: chatId,
            messages: [optimisticMessage],
            capabilities: [],
            type: ChatType.ONE_TO_ONE,
            status: ChatStatus.OPEN,
          };
        }
        if (oldData.messages.some((item) => item.id === optimisticMessage.id)) {
          return {
            ...oldData,
            messages: oldData.messages.map((item) =>
              item.id === optimisticMessage.id
                ? { ...optimisticMessage, createdAt: item.createdAt }
                : item,
            ),
          };
        }
        return {
          ...oldData,
          messages: [...oldData.messages, optimisticMessage],
        };
      },
    );
  }

  // optimistically update the chat overview
  trpcUtils.chat.chats.setData({}, (oldChats) => {
    if (!oldChats) return [];
    return oldChats.map((chat) => {
      if (chat.id === chatId) {
        return {
          ...chat,
          lastMessage: {
            id: optimisticMessage.id,
            senderId: optimisticMessage.senderId ?? SYSTEM_SENDER_ID,
            // derived with the same helper the server uses, so the preview does not
            // change once the real message is synced back
            messagePreview: getMessagePreviewText({
              contentVersions: [{ payload: optimisticMessage.messagePayload }],
            }),
            createdAt: optimisticMessage.createdAt,
            status: optimisticMessage.status,
            type: optimisticMessage.type,
          },
          lastUpdate: optimisticMessage.createdAt,
          unreadCount: 0,
        };
      }
      return chat;
    });
  });

  return { previousChatData, previousInfiniteData, optimisticMessageId: optimisticMessage.id };
};

export const useMessageSend = (): UseMessageSendMutation => {
  const trpcUtils = trpc.useUtils();
  const { data: currentUser } = trpc.chat.user.useQuery({});
  const { cancelQuote } = useChatActions();

  return trpc.chat.sendMessage.useMutation({
    networkMode: 'always',
    async onMutate({ chatId, content, type, quotedMessageId, parentId, messageId, timestamp }) {
      const messageType = type ?? MessageType.TEXT_MSG;

      // Queue the send before its request goes out, not once it failed: the composer and
      // its draft are already empty, and a PWA suspended or killed mid-request would
      // otherwise lose the text. The server recognises the message id, so the drain
      // replaying a send that did arrive stores nothing twice.
      if (messageId !== undefined) {
        setSendInFlight(messageId, true);
        addMessageToOutbox({
          type: 'MESSAGE',
          id: messageId,
          chatId,
          content,
          messageType,
          quotedMessageId: quotedMessageId ?? undefined,
          parentId: parentId ?? undefined,
          createdAt: (timestamp instanceof Date ? timestamp : new Date()).toISOString(),
          userId: currentUser,
        });
      }

      // Immediately clear the citation preview in the UI
      cancelQuote();

      return performOptimisticMessageUpdate(trpcUtils, currentUser, {
        chatId,
        content,
        type: messageType,
        quotedMessageId: quotedMessageId ?? undefined,
        parentId: parentId ?? undefined,
        messageId: messageId ?? undefined,
      });
    },

    onError: (error, variables, context) => {
      const { chatId, parentId } = variables;
      const isOfflineError =
        !navigator.onLine ||
        error.message === 'Failed to fetch' ||
        error.message.includes('Network request failed');

      if (isOfflineError) {
        // the send stays in the outbox it was queued in on mutate
        if (context?.optimisticMessageId) {
          const optimisticMessageId = context.optimisticMessageId;

          // Mark the cached optimistic message as pending so the UI shows the
          // queued state (clock icon) even if the app still believed it was online
          const markPending = (item: ChatMessage): ChatMessage =>
            item.id === optimisticMessageId ? { ...item, isPendingOffline: true } : item;

          trpcUtils.chat.infiniteMessages.setInfiniteData(
            { chatId, limit: CHAT_PAGE_SIZE, parentId: parentId ?? undefined },
            (data: InfiniteMessagesData | undefined): InfiniteMessagesData | undefined => {
              if (!data) return data;
              return {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  items: page.items.map((item) => markPending(item)),
                })),
              };
            },
          );

          if (!parentId) {
            trpcUtils.chat.chatDetails.setData(
              { chatId },
              (oldData: ChatDetails | undefined): ChatDetails | undefined => {
                if (!oldData) return oldData;
                return { ...oldData, messages: oldData.messages.map((item) => markPending(item)) };
              },
            );
          }
        }
        // a retry of a failed send that fell back to the outbox: the outbox owns it now
        if (context?.optimisticMessageId !== undefined) {
          forgetFailedSend(context.optimisticMessageId);
        }
        toast.success('Message queued. Will be sent when online.');
        return;
      }

      console.error('Failed to send message, keeping it as a failed bubble:', error);

      // The bubble stays where it is with an inline retry; rolling it back and raising a
      // toast made the text vanish from the conversation the moment it failed.
      const failedMessageId = context?.optimisticMessageId;
      if (failedMessageId === undefined) return;
      // refused for good: replaying it from the outbox would fail the same way
      removeMessageFromOutbox(failedMessageId);
      const markFailed = (item: ChatMessage): ChatMessage =>
        item.id === failedMessageId ? { ...item, sendFailed: true } : item;

      trpcUtils.chat.infiniteMessages.setInfiniteData(
        { chatId, limit: CHAT_PAGE_SIZE, parentId: parentId ?? undefined },
        (data: InfiniteMessagesData | undefined): InfiniteMessagesData | undefined => {
          if (!data) return data;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => markFailed(item)),
            })),
          };
        },
      );

      if (!parentId) {
        trpcUtils.chat.chatDetails.setData(
          { chatId },
          (oldData: ChatDetails | undefined): ChatDetails | undefined => {
            if (!oldData) return oldData;
            return { ...oldData, messages: oldData.messages.map((item) => markFailed(item)) };
          },
        );
      }

      // persisted, so the next refetch of the list (which never had it) cannot drop it
      const failedMessage = trpcUtils.chat.infiniteMessages
        .getInfiniteData({ chatId, limit: CHAT_PAGE_SIZE, parentId: parentId ?? undefined })
        ?.pages.flatMap((page) => page.items)
        .find((item) => item.id === failedMessageId);
      if (failedMessage) rememberFailedSend(failedMessage, variables);

      // the overview was optimistically given this message as the chat's last one
      void trpcUtils.chat.chats.invalidate();
    },

    onSuccess: (createdMessageData, { chatId, parentId }, context) => {
      const createdMessage = createdMessageData as unknown as ChatMessage | undefined;
      if (createdMessage === undefined) return;

      const optimisticMessageId = (context as OptimisticUpdateResult | undefined)
        ?.optimisticMessageId;
      if (optimisticMessageId !== undefined) {
        removeMessageFromOutbox(optimisticMessageId);
        // a retry of a failed send went through
        forgetFailedSend(optimisticMessageId);
      }

      // Update the infinite query cache
      trpcUtils.chat.infiniteMessages.setInfiniteData(
        { chatId, limit: CHAT_PAGE_SIZE, parentId: parentId ?? undefined },
        (data: InfiniteMessagesData | undefined): InfiniteMessagesData | undefined => {
          if (!data) return data;

          // merge across all pages at once so a copy already delivered by SSE on another
          // page does not survive next to the one replacing the optimistic bubble
          const mergedPages = mergeStoredMessageAcrossPages(
            data.pages.map((page) => page.items),
            createdMessage,
            optimisticMessageId,
          );

          return {
            ...data,
            pages: data.pages.map((page, index) => ({
              ...page,
              items: mergedPages[index] ?? page.items,
            })),
          };
        },
      );

      // Update the chatDetails cache only if it's not a thread reply
      if (!parentId) {
        trpcUtils.chat.chatDetails.setData(
          { chatId },
          (oldData: ChatDetails | undefined): ChatDetails | undefined => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              messages: mergeStoredMessage(oldData.messages, createdMessage, optimisticMessageId),
            };
          },
        );
      }

      // Invalidate chats overview for unread counts and sidebar updates
      void trpcUtils.chat.chats.invalidate();
    },

    onSettled: (_data, _error, { messageId }) => {
      // from here on a send still in the outbox is the drain's to replay
      if (messageId !== undefined) setSendInFlight(messageId, false);
    },
  });
};
