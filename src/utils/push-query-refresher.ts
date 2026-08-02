import type { trpc } from '@/trpc/client';
import { MessageEventType } from '@prisma/client';

const CHAT_PAGE_SIZE = 50;

interface PushChatMessage {
  id: string;
  createdAt: Date;
  messagePayload: { text: string };
  senderId?: string;
  senderName?: string;
  status: MessageEventType;
  type: string;
}

export function refreshAndOptimisticallyUpdateChat(
  trpcUtils: ReturnType<typeof trpc.useUtils>,
  chatId: string | undefined,
  payload?: Record<string, unknown>,
): void {
  if (typeof chatId !== 'string' || chatId.trim() === '') return;

  const cleanChatId = chatId.trim();

  // 1. If payload contains message content or messageId, perform optimistic TanStack cache update
  if (payload && typeof payload === 'object') {
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
        status: MessageEventType.CREATED,
        type: 'TEXT_MSG',
      };

      // Optimistically update infiniteMessages cache
      trpcUtils.chat.infiniteMessages.setInfiniteData(
        { chatId: cleanChatId, limit: CHAT_PAGE_SIZE, parentId: undefined },
        (old) => {
          if (!old) return old;
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
                    items: [pushMessage as unknown as (typeof page.items)[number], ...page.items],
                  }
                : page,
            ),
          };
        },
      );

      // Optimistically update chatDetails cache
      trpcUtils.chat.chatDetails.setData({ chatId: cleanChatId }, (old) => {
        if (!old) return old;
        if (old.messages.some((item) => item.id === pushMessage.id)) {
          return old;
        }
        return {
          ...old,
          messages: [...old.messages, pushMessage as unknown as (typeof old.messages)[number]],
        };
      });
    }
  }

  // 2. Invalidate and trigger background refetch for fresh chat content
  void trpcUtils.chat.infiniteMessages.invalidate({ chatId: cleanChatId });
  void trpcUtils.chat.chatDetails.invalidate({ chatId: cleanChatId });
  void trpcUtils.chat.chats.invalidate();
}
