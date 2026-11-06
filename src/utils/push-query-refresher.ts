import { CHAT_PAGE_SIZE } from '@/lib/chat-shared';
import type { TrpcQueries } from '@/trpc/client';
import type { QueryKey } from '@tanstack/react-query';

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

export function refreshAndOptimisticallyUpdateChat(
  queries: TrpcQueries | undefined,
  chatId: string | undefined,
  payload?: Record<string, unknown>,
): void {
  if (queries === undefined || typeof chatId !== 'string' || chatId.trim() === '') return;

  const { trpc, queryClient } = queries;
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

      // Optimistically update infiniteMessages cache, under the key the chat screen reads: the
      // limit is part of it
      // Typed loosely on purpose: a push carries only part of a message, and the next refetch
      // replaces it with the real one.
      const infiniteMessagesKey: QueryKey = trpc.chat.infiniteMessages.infiniteQueryKey({
        chatId: cleanChatId,
        limit: CHAT_PAGE_SIZE,
        parentId: undefined,
      });
      queryClient.setQueryData<InfiniteMessagesData>(infiniteMessagesKey, (old) => {
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
      });

      // Optimistically update chatDetails cache
      const chatDetailsKey: QueryKey = trpc.chat.chatDetails.queryKey({ chatId: cleanChatId });
      queryClient.setQueryData<ChatDetailsData>(chatDetailsKey, (old) => {
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
  void queryClient.invalidateQueries(
    trpc.chat.infiniteMessages.infiniteQueryFilter({ chatId: cleanChatId }),
  );
  void queryClient.invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId: cleanChatId }));
  void queryClient.invalidateQueries(trpc.chat.chats.queryFilter());
}
