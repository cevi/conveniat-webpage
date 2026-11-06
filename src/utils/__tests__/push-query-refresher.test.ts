import { CHAT_PAGE_SIZE } from '@/lib/chat-shared';
import { createTestTrpc } from '@/trpc/test-trpc';
import { refreshChatOfPush } from '@/utils/push-query-refresher';

describe('refreshChatOfPush', () => {
  it('makes the chat ask again for its messages and adds none of its own', () => {
    const queries = createTestTrpc();
    const { trpc, queryClient } = queries;
    // the key `useMessageInfiniteScroll` reads
    const screenKey = trpc.chat.infiniteMessages.infiniteQueryKey({
      chatId: 'chat-cevi-uster',
      limit: CHAT_PAGE_SIZE,
      parentId: undefined,
    });
    const messages = {
      pages: [{ items: [{ id: 'message-1' }], nextCursor: undefined }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(screenKey, messages as never);

    refreshChatOfPush(queries, 'chat-cevi-uster');

    expect(queryClient.getQueryState(screenKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(screenKey)).toEqual(messages);
  });
});
