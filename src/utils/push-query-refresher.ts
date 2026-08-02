import type { trpc } from '@/trpc/client';

const CHAT_PAGE_SIZE = 50;

interface PushChatMessage {
  id: string;
  createdAt: Date;
  messagePayload: { text: string };
  senderId?: string | undefined;
  senderName?: string | undefined;
  status: string;
  type: string;
  [key: string]: unknown;
}

interface InfiniteMessagesData {
  pages: Array<{
    items: Array<PushChatMessage & Record<string, unknown>>;
  }>;
}

interface ChatDetailsData {
  messages: Array<PushChatMessage & Record<string, unknown>>;
}

interface MinimalTrpcUtils {
  chat?: {
    infiniteMessages?: {
      setInfiniteData: (
        queryKey: { chatId: string; limit: number; parentId: undefined },
        updater: (old: InfiniteMessagesData | undefined) => InfiniteMessagesData | undefined,
      ) => void;
      invalidate: (queryKey: { chatId: string }) => Promise<void>;
    };
    chatDetails?: {
      setData: (
        queryKey: { chatId: string },
        updater: (old: ChatDetailsData | undefined) => ChatDetailsData | undefined,
      ) => void;
      invalidate: (queryKey: { chatId: string }) => Promise<void>;
    };
    chats?: {
      invalidate: () => Promise<void>;
    };
  };
}

export function refreshAndOptimisticallyUpdateChat(
  trpcUtils: ReturnType<typeof trpc.useUtils> | undefined,
  chatId: string | undefined,
  payload?: Record<string, unknown>,
): void {
  if (trpcUtils === undefined || typeof chatId !== 'string' || chatId.trim() === '') return;

  const utils = trpcUtils as unknown as MinimalTrpcUtils;
  const chatQueries = utils.chat;
  if (chatQueries === undefined) return;

  const cleanChatId = chatId.trim();

  // 1. If payload contains message content or messageId, perform optimistic TanStack cache update
  if (payload !== undefined && typeof payload === 'object') {
    const rawMessageId = payload['messageId'] ?? payload['id'];
    const rawContent =
      payload['body'] ?? payload['message'] ?? payload['content'] ?? payload['text'];
    const rawSenderName = payload['senderName'] ?? payload['title'];
    const rawSenderId = payload['senderId'];

    if (
      (typeof rawMessageId === 'string' && rawMessageId.trim() !== '') ||
      (typeof rawContent === 'string' && rawContent.trim() !== '')
    ) {
      const messageId =
        typeof rawMessageId === 'string' && rawMessageId.trim() !== ''
          ? rawMessageId.trim()
          : `push-optimistic-${Date.now()}`;

      const content = typeof rawContent === 'string' ? rawContent.trim() : '';

      const pushMessage: PushChatMessage = {
        id: messageId,
        messagePayload: { text: content },
        createdAt: new Date(),
        senderId: typeof rawSenderId === 'string' ? rawSenderId : undefined,
        senderName: typeof rawSenderName === 'string' ? rawSenderName : undefined,
        status: 'CREATED',
        type: 'TEXT_MSG',
      };

      // Optimistically update infiniteMessages cache
      chatQueries.infiniteMessages?.setInfiniteData(
        { chatId: cleanChatId, limit: CHAT_PAGE_SIZE, parentId: undefined },
        (old) => {
          if (old === undefined) return old;
          const allItems = old.pages.flatMap((page) => page.items);
          if (allItems.some((item) => item.id === pushMessage.id)) {
            return old;
          }
          return {
            ...old,
            pages: old.pages.map((page, index) =>
              index === 0
                ? {
                    ...page,
                    items: [pushMessage, ...page.items],
                  }
                : page,
            ),
          };
        },
      );

      // Optimistically update chatDetails cache
      chatQueries.chatDetails?.setData({ chatId: cleanChatId }, (old) => {
        if (old === undefined) return old;
        if (old.messages.some((item) => item.id === pushMessage.id)) {
          return old;
        }
        return {
          ...old,
          messages: [...old.messages, pushMessage],
        };
      });
    }
  }

  // 2. Invalidate and trigger background refetch for fresh chat content
  void chatQueries.infiniteMessages?.invalidate({ chatId: cleanChatId });
  void chatQueries.chatDetails?.invalidate({ chatId: cleanChatId });
  void chatQueries.chats?.invalidate();
}
