import { CHAT_PAGE_SIZE } from '@/lib/chat-shared';
import { createTestTrpc } from '@/trpc/test-trpc';
import { refreshAndOptimisticallyUpdateChat } from '@/utils/push-query-refresher';

describe('refreshAndOptimisticallyUpdateChat', () => {
  it('puts a pushed message at the top of the messages the chat screen shows', () => {
    const queries = createTestTrpc();
    const { trpc, queryClient } = queries;
    // the key `useMessageInfiniteScroll` reads
    const screenKey = trpc.chat.infiniteMessages.infiniteQueryKey({
      chatId: 'chat-cevi-uster',
      limit: CHAT_PAGE_SIZE,
      parentId: undefined,
    });
    queryClient.setQueryData(screenKey, {
      pages: [{ items: [{ id: 'message-1' }], nextCursor: undefined }],
      pageParams: [undefined],
    } as never);

    refreshAndOptimisticallyUpdateChat(queries, 'chat-cevi-uster', {
      messageId: 'message-2',
      body: 'Znacht isch parat',
      senderName: 'Küche',
    });

    const firstPage = queryClient.getQueryData(screenKey)?.pages[0];
    expect(firstPage?.items.map((item) => item.id)).toEqual(['message-2', 'message-1']);
    expect(firstPage?.items[0]?.messagePayload).toEqual({ text: 'Znacht isch parat' });
  });
});
