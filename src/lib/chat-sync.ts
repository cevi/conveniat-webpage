import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { CHAT_PAGE_SIZE } from '@/lib/chat-shared';
import type { trpc } from '@/trpc/client';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

/**
 * Prefetches all chats, chat details, and recent messages (first page) for the current user.
 * This populates the TanStack Query cache, which is automatically persisted in localStorage.
 */
export const syncChatsOffline = async (
  trpcUtils: ReturnType<typeof trpc.useUtils>,
): Promise<void> => {
  try {
    console.log('[Offline Sync] Starting offline chat sync...');

    // 1. Ensure the user details, contacts, and capabilities are cached
    await trpcUtils.chat.user.ensureData({});
    await trpcUtils.chat.contacts.ensureData({}).catch(console.warn);
    await trpcUtils.chat.checkCapability
      .ensureData({
        action: CapabilityAction.Create,
        subject: CapabilitySubject.Chat,
      })
      .catch(console.warn);

    // 2. Fetch the list of chats and cache it
    const chats = await trpcUtils.chat.chats.fetch({});
    console.log(`[Offline Sync] Found ${chats.length} chats to sync.`);

    // 3. Concurrently prefetch details and infinite message history for each chat
    const chatUrlsToCache: string[] = [];
    await Promise.all(
      chats.map(async (chat) => {
        try {
          // Prefetch individual chat details
          await trpcUtils.chat.chatDetails.ensureData({ chatId: chat.id });

          // Prefetch first page of infinite messages matching exact hook query key signature
          await trpcUtils.chat.infiniteMessages.prefetchInfinite({
            chatId: chat.id,
            limit: CHAT_PAGE_SIZE,
            parentId: undefined,
          });

          chatUrlsToCache.push(`/app/chat/${chat.id}`);

          console.log(`[Offline Sync] Successfully synced chat data for: ${chat.id}`);
        } catch (error) {
          console.warn(`[Offline Sync] Failed to prefetch chat data for ${chat.id}:`, error);
        }
      }),
    );

    if (
      chatUrlsToCache.length > 0 &&
      typeof navigator !== 'undefined' &&
      navigator.serviceWorker.controller
    ) {
      navigator.serviceWorker.controller.postMessage({
        type: ServiceWorkerMessages.CACHE_DYNAMIC_ROUTES,
        urls: chatUrlsToCache,
      });
      console.log(
        `[Offline Sync] Requested SW to cache ${chatUrlsToCache.length} dynamic chat routes.`,
      );
    }

    console.log('[Offline Sync] Offline chat sync complete.');
  } catch (error) {
    console.error('[Offline Sync] Failed to execute offline chat sync:', error);
  }
};

/**
 * Prefetches emergency alert settings and emergency cards (including linked images and documents)
 * for the current user. This populates the TanStack Query cache and SW asset cache for offline availability.
 */
export const syncEmergencyOffline = async (
  trpcUtils: ReturnType<typeof trpc.useUtils>,
): Promise<void> => {
  try {
    console.log('[Offline Sync] Starting offline emergency cards sync...');

    // 1. Fetch and cache emergency alert settings
    await trpcUtils.emergency.getAlertSettings.ensureData();

    // 2. Fetch and cache emergency cards
    const emergencyCards = await trpcUtils.emergency.getEmergencyCards.ensureData();
    console.log(`[Offline Sync] Found ${emergencyCards.length} emergency cards to sync.`);

    // 3. Pre-fetch linked images and documents for offline viewing
    const assetUrls = new Set<string>();
    for (const card of emergencyCards) {
      if (Array.isArray(card.documents)) {
        for (const document_ of card.documents) {
          if (typeof document_ !== 'string' && document_.url) {
            assetUrls.add(document_.url);
          }
        }
      }
      if (Array.isArray(card.images)) {
        for (const img of card.images) {
          if (typeof img !== 'string' && img.url) {
            assetUrls.add(img.url);
          }
        }
      }
    }

    if (assetUrls.size > 0 && typeof globalThis.fetch === 'function') {
      console.log(
        `[Offline Sync] Pre-fetching ${assetUrls.size} media assets for emergency cards...`,
      );
      await Promise.all(
        [...assetUrls].map(async (url) => {
          try {
            await fetch(url, { mode: 'cors' });
          } catch (error) {
            console.warn(`[Offline Sync] Failed to pre-fetch asset ${url}:`, error);
          }
        }),
      );
    }

    console.log('[Offline Sync] Offline emergency cards sync complete.');
  } catch (error) {
    console.error('[Offline Sync] Failed to execute offline emergency cards sync:', error);
  }
};

const safePrefetch = async <T>(promise: Promise<T>): Promise<T | undefined> => {
  try {
    return await promise;
  } catch (error) {
    // Log friendly debug message instead of throwing unhandled HTML/JSON syntax errors
    if (error instanceof Error && error.message.includes('not valid JSON')) {
      console.warn(
        '[Offline Sync] Server returned HTML page instead of JSON during prefetch (server error or offline redirect).',
      );
    } else {
      console.warn('[Offline Sync] Prefetch skipped due to network/server condition:', error);
    }
    return undefined;
  }
};

/**
 * Syncs all offline application data (chats, emergency cards, schedule, map, presence, photo contest).
 */
export const syncAllOfflineData = async (
  trpcUtils: ReturnType<typeof trpc.useUtils>,
): Promise<void> => {
  await Promise.all([
    safePrefetch(syncChatsOffline(trpcUtils)),
    safePrefetch(syncEmergencyOffline(trpcUtils)),
    (async (): Promise<void> => {
      const scheduleEntries = await safePrefetch(
        trpcUtils.schedule.getScheduleEntries.ensureData(),
      );
      if (Array.isArray(scheduleEntries) && scheduleEntries.length > 0) {
        for (const entry of scheduleEntries) {
          if (typeof entry.id === 'string' && entry.id.length > 0) {
            trpcUtils.schedule.getById.setData({ id: entry.id }, entry);
          }
        }
        try {
          const { scheduleEntriesCollection } = await import('@/lib/tanstack-db');
          for (const entry of scheduleEntries) {
            if (typeof entry.id === 'string' && entry.id.length > 0) {
              const current = scheduleEntriesCollection.get(entry.id);
              const recordToSave = {
                ...entry,
                _syncedAt: Date.now(),
              } as unknown as import('@/lib/tanstack-db').ScheduleEntryRecord;
              if (current === undefined) {
                scheduleEntriesCollection.insert(recordToSave);
              } else {
                scheduleEntriesCollection.update(entry.id, (old) => ({
                  ...old,
                  ...recordToSave,
                }));
              }
            }
          }
        } catch (error) {
          console.warn('[Offline Sync] Failed to update TanStack DB schedule collection:', error);
        }

        // Pre-cache course statuses for enrollment display
        const courseIds = scheduleEntries
          .map((entry) => entry.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
        if (courseIds.length > 0) {
          await safePrefetch(trpcUtils.schedule.getCourseStatuses.ensureData({ courseIds }));
        }
      }
    })(),
    safePrefetch(trpcUtils.schedule.getMyEnrollments.ensureData()),
    safePrefetch(trpcUtils.shifts.getMyShiftEnrollments.ensureData()),
    (async (): Promise<void> => {
      const shifts = await safePrefetch(trpcUtils.schedule.getHelperShifts.ensureData());
      if (Array.isArray(shifts) && shifts.length > 0) {
        await Promise.all(
          shifts.map((shift) => {
            if (typeof shift.id === 'string' && shift.id.length > 0) {
              return safePrefetch(
                trpcUtils.shifts.getShiftStatus.ensureData({ shiftId: shift.id }),
              );
            }
            return Promise.resolve();
          }),
        );
      }
    })(),
    safePrefetch(trpcUtils.map.getMapAnnotations.ensureData({ locale: 'de' })),
    safePrefetch(trpcUtils.map.getMapAnnotations.ensureData({ locale: 'en' })),
    safePrefetch(trpcUtils.map.getMapAnnotations.ensureData({ locale: 'fr' })),
    safePrefetch(trpcUtils.map.getAnnotations.ensureData()),
    safePrefetch(trpcUtils.presence.getPresence.ensureData()),
    safePrefetch(trpcUtils.photoContest.getContests.ensureData()),
    safePrefetch(trpcUtils.chat.getFeatureFlags.ensureData()),
  ]);
};
