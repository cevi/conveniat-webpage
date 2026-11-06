import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import type { TrpcQueries } from '@/trpc/client';

/**
 * Marks the system message a chat opens with as waiting for the server, stored, or refused for
 * good. The chat view shows a clock under a waiting one and the refusal under a refused one; the
 * outbox moves it on once it has replayed the creation.
 */
export const markChatCreation = (
  { trpc, queryClient }: TrpcQueries,
  chatId: string,
  state: 'pending' | 'stored' | 'failed',
): void => {
  // compared by value: the Prisma enum would pull its runtime into the browser hooks' tests
  const mark = (item: ChatMessage): ChatMessage =>
    item.type === 'SYSTEM_MSG'
      ? { ...item, isPendingOffline: state === 'pending', sendFailed: state === 'failed' }
      : item;

  queryClient.setQueryData(trpc.chat.chatDetails.queryKey({ chatId }), (oldData) =>
    oldData === undefined
      ? oldData
      : { ...oldData, messages: oldData.messages.map((item) => mark(item)) },
  );
  queryClient.setQueryData(
    trpc.chat.infiniteMessages.infiniteQueryKey({
      chatId,
      limit: CHAT_PAGE_SIZE,
      parentId: undefined,
    }),
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
