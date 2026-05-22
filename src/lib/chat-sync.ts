import type { trpc } from '@/trpc/client';

const CHAT_PAGE_SIZE = 25;

/**
 * Prefetches all chats, chat details, and recent messages (first page) for the current user.
 * This populates the TanStack Query cache, which is automatically persisted in localStorage.
 */
export const syncChatsOffline = async (
  trpcUtils: ReturnType<typeof trpc.useUtils>,
): Promise<void> => {
  try {
    console.log('[Offline Sync] Starting offline chat sync...');

    // 1. Ensure the user details are cached
    await trpcUtils.chat.user.ensureData({});

    // 2. Fetch the list of chats and cache it
    const chats = await trpcUtils.chat.chats.fetch({});
    console.log(`[Offline Sync] Found ${chats.length} chats to sync.`);

    // 3. Concurrently prefetch details and infinite message history for each chat
    await Promise.all(
      chats.map(async (chat) => {
        try {
          // Prefetch individual chat details
          await trpcUtils.chat.chatDetails.ensureData({ chatId: chat.id });

          // Prefetch first page of infinite messages
          await trpcUtils.chat.infiniteMessages.prefetchInfinite({
            chatId: chat.id,
            limit: CHAT_PAGE_SIZE,
          });

          console.log(`[Offline Sync] Successfully synced chat data for: ${chat.id}`);
        } catch (error) {
          console.warn(`[Offline Sync] Failed to prefetch chat data for ${chat.id}:`, error);
        }
      }),
    );

    console.log('[Offline Sync] Offline chat sync complete.');
  } catch (error) {
    console.error('[Offline Sync] Failed to execute offline chat sync:', error);
  }
};
