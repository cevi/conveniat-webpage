import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import type { trpc } from '@/trpc/client';

/**
 * Marks the system message a chat opens with as waiting for the server, or as stored. The chat
 * view shows a clock under a waiting one; the outbox clears it once it has created the chat.
 */
export const markChatCreationPending = (
  trpcUtils: ReturnType<typeof trpc.useUtils>,
  chatId: string,
  isPending: boolean,
): void => {
  // compared by value: the Prisma enum would pull its runtime into the browser hooks' tests
  const mark = (item: ChatMessage): ChatMessage =>
    item.type === 'SYSTEM_MSG' ? { ...item, isPendingOffline: isPending } : item;

  trpcUtils.chat.chatDetails.setData({ chatId }, (oldData) =>
    oldData === undefined
      ? oldData
      : { ...oldData, messages: oldData.messages.map((item) => mark(item)) },
  );
  trpcUtils.chat.infiniteMessages.setInfiniteData(
    { chatId, limit: CHAT_PAGE_SIZE, parentId: undefined },
    (data) =>
      data === undefined
        ? data
        : {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => mark(item)),
            })),
          },
  );
};
