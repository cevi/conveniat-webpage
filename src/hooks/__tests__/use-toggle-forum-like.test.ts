/**
 * @jest-environment jsdom
 */

import { useToggleForumLike } from '@/hooks/use-toggle-forum-like';
import { FORUM_LIKE_EMOJI } from '@/lib/forum-shared';
import { createTestTrpc } from '@/trpc/test-trpc';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

describe('useToggleForumLike', () => {
  it('a like given on the map shows on the post and in the composer suggestions', async () => {
    const toggleReaction = jest.fn(async () => {});
    const { trpc, queryClient, wrapper } = createTestTrpc({
      'chat.toggleReaction': toggleReaction,
    });
    const postKey = trpc.forum.getForumPost.queryKey({ postId: 'post-zueri-11-wc' });
    const suggestionsKey = trpc.forum.getForumPostSuggestionList.queryKey({ title: 'WC' });
    queryClient.setQueryData(postKey, { likedByMe: false, likeCount: 2 } as never);
    queryClient.setQueryData(suggestionsKey, [] as never);
    const { result } = renderHook(() => useToggleForumLike(), { wrapper });

    act(() => {
      result.current.mutate({ messageId: 'post-zueri-11-wc', emoji: FORUM_LIKE_EMOJI });
    });

    expect(queryClient.getQueryData(postKey)).toMatchObject({ likedByMe: true, likeCount: 3 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toggleReaction).toHaveBeenCalledWith({
      messageId: 'post-zueri-11-wc',
      emoji: FORUM_LIKE_EMOJI,
    });
    // both answer again the next time they are shown, instead of the count from before the like
    expect(queryClient.getQueryState(postKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(suggestionsKey)?.isInvalidated).toBe(true);
  });
});
