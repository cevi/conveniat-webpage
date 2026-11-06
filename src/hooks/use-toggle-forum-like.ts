import type { TrpcError } from '@/trpc/client';
import { useTRPC } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { inferProcedureInput } from '@trpc/server';

type ToggleReactionInput = inferProcedureInput<AppRouter['chat']['toggleReaction']>;

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
  ToggleReactionInput
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation({
    ...trpc.chat.toggleReaction.mutationOptions(),
    onMutate: ({ messageId }) => {
      queryClient.setQueryData(trpc.forum.getForumPost.queryKey({ postId: messageId }), (old) =>
        old === undefined
          ? old
          : {
              ...old,
              likedByMe: !old.likedByMe,
              likeCount: old.likeCount + (old.likedByMe ? -1 : 1),
            },
      );
    },
    onSettled: () => void queryClient.invalidateQueries(trpc.forum.pathFilter()),
  });
};
