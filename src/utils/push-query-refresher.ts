import type { TrpcQueries } from '@/trpc/client';

/**
 * Refetches the chat a push is about, so the message it announces is there when the chat opens.
 *
 * A push is a notification, not a message: its title is the chat's name, its body is
 * "Sender: text", and on the native app the top-level `messageId` is Firebase's. A message built
 * from it would show the wrong sender and text, and appear twice once the real one arrives, so
 * the cache only learns about the message from the server.
 */
export function refreshChatOfPush(
  queries: TrpcQueries | undefined,
  chatId: string | undefined,
): void {
  if (queries === undefined || typeof chatId !== 'string' || chatId.trim() === '') return;

  const { trpc, queryClient } = queries;
  const cleanChatId = chatId.trim();

  void queryClient.invalidateQueries(
    trpc.chat.infiniteMessages.infiniteQueryFilter({ chatId: cleanChatId }),
  );
  void queryClient.invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId: cleanChatId }));
  void queryClient.invalidateQueries(trpc.chat.chats.queryFilter());
}
