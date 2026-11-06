import type { TrpcError } from '@/trpc/client';
import { useTRPC } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

type ToggleReactionInput = inferProcedureInput<AppRouter['chat']['toggleReaction']>;

/** The post as it was before the like, to put back when the like fails. */
interface LikeContext {
  previous: inferProcedureOutput<AppRouter['forum']['getForumPost']> | undefined;
}

/**
 * Likes or unlikes a forum post, from wherever it is shown.
 *
 * The like count is part of the post, of every post list, the map's lists, the composer's
 * suggestions and the moderation views, so after a like the whole forum router is refetched
 * rather than guessing which of them is on screen. Only the queries in use ask again, in one
 * batched request; the rest are marked stale and refresh when they are shown next. An open
 * post flips at once and is corrected by that refetch.
 */
export const useToggleForumLike = (): UseMutationResult<
  unknown,
  TrpcError,
  ToggleReactionInput,
  LikeContext
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.chat.toggleReaction.mutationOptions<LikeContext>(),
    onMutate: async ({ messageId }) => {
      const postKey = trpc.forum.getForumPost.queryKey({ postId: messageId });
      // a fetch already on its way would overwrite the flip with the count from before the like
      await queryClient.cancelQueries({ queryKey: postKey });
      const previous = queryClient.getQueryData(postKey);
      if (previous !== undefined) {
        queryClient.setQueryData(postKey, {
          ...previous,
          likedByMe: !previous.likedByMe,
          likeCount: previous.likeCount + (previous.likedByMe ? -1 : 1),
        });
      }
      return { previous };
    },
    // The refetch below only reaches a post on screen. A post liked from the map or the composer
    // is only marked stale, and offline it would keep a like that never happened.
    onError: (_error, { messageId }, context) => {
      if (context?.previous === undefined) return;
      queryClient.setQueryData(
        trpc.forum.getForumPost.queryKey({ postId: messageId }),
        context.previous,
      );
    },
    onSettled: () => void queryClient.invalidateQueries(trpc.forum.pathFilter()),
  });
};
