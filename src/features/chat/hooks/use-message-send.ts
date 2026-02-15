import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
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
  unknown
>;

type InfiniteMessagesOutput = inferProcedureOutput<AppRouter['chat']['infiniteMessages']>;
type InfiniteMessagesData = InfiniteData<InfiniteMessagesOutput, string | null>;

interface OptimisticUpdateResult {
  previousChatData: ChatDetails | undefined;
  previousInfiniteData: InfiniteMessagesData | undefined;
}

const performOptimisticMessageUpdate = async (
  trpcUtils: ReturnType<typeof trpc.useUtils>,
  currentUser: string,
  {
    chatId,
    content,
    quotedMessageId,
  }: { chatId: string; content: string; quotedMessageId?: string | undefined },
): Promise<OptimisticUpdateResult> => {
  await trpcUtils.chat.chatDetails.cancel({ chatId });
  await trpcUtils.chat.infiniteMessages.cancel({ chatId, limit: 25 });

  const previousChatData = trpcUtils.chat.chatDetails.getData({ chatId });
  const previousInfiniteData = trpcUtils.chat.infiniteMessages.getInfiniteData({
    chatId,
    limit: 25,
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

  const optimisticMessage: ChatMessage = {
    id: `optimistic-${Date.now()}`,
    messagePayload: {
      text: content.trim(),
      ...(typeof quotedMessageId === 'string' &&
        quotedMessageId.length > 0 && { quotedMessageId, quotedSnippet }),
    },
    createdAt: new Date(),
    senderId: currentUser,
    status: MessageEventType.CREATED,
    type: MessageType.TEXT_MSG,
    parentId: undefined,
  };

  // optimistically update the infinite messages
  trpcUtils.chat.infiniteMessages.setInfiniteData(
    { chatId, limit: 25 },
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

  // optimistically update the chat details
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
        };
      }
      return {
        ...oldData,
        messages: [...oldData.messages, optimisticMessage],
      };
    },
  );

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
            messagePreview:
              optimisticMessage.type === MessageType.IMAGE_MSG
                ? {
                    de: '📷 Bild',
                    en: '📷 Image',
                    fr: '📷 Image',
                  }
                : JSON.stringify(content.trim()),
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

  return { previousChatData, previousInfiniteData };
};

export const useMessageSend = (): UseMessageSendMutation => {
  const trpcUtils = trpc.useUtils();
  const { data: currentUser } = trpc.chat.user.useQuery({});
  const { cancelQuote } = useChatActions();

  return trpc.chat.sendMessage.useMutation({
    async onMutate({ chatId, content, quotedMessageId }) {
      if (typeof currentUser !== 'string' || currentUser === '') {
        throw new Error('Current user is not defined');
      }

      // Immediately clear the citation preview in the UI
      cancelQuote();

      return performOptimisticMessageUpdate(trpcUtils, currentUser, {
        chatId,
        content,
        quotedMessageId: quotedMessageId ?? undefined,
      });
    },

    onError: (error, { chatId }, context) => {
      toast.error('Failed to send message', error);
      console.error('Failed to send message, rolling back optimistic update:', error);

      const optimisticContext = context;

      if (optimisticContext?.previousChatData) {
        trpcUtils.chat.chatDetails.setData({ chatId }, optimisticContext.previousChatData);
      } else {
        trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
      }

      if (optimisticContext?.previousInfiniteData) {
        trpcUtils.chat.infiniteMessages.setInfiniteData(
          { chatId, limit: 25 },
          optimisticContext.previousInfiniteData,
        );
      } else {
        trpcUtils.chat.infiniteMessages.invalidate({ chatId }).catch(console.error);
      }
    },

    onSuccess: (_, { chatId }) => {
      trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
      trpcUtils.chat.infiniteMessages.invalidate({ chatId }).catch(console.error);
    },
  });
};
