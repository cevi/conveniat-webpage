import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { CHAT_PAGE_SIZE } from '@/lib/chat-shared';
import type { trpc } from '@/trpc/client';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

/**
 * Serialises a schedule entry ignoring `_syncedAt`, which changes on every sync by definition
 * and would otherwise mark every entry as modified.
 */
const contentFingerprint = (record: object): string =>
  JSON.stringify({ ...record, _syncedAt: undefined });

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
      'serviceWorker' in navigator &&
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
    // eslint-disable-next-line unicorn/no-useless-undefined
    await trpcUtils.emergency.getAlertSettings.ensureData(undefined);

    // 2. Fetch and cache emergency cards
    // eslint-disable-next-line unicorn/no-useless-undefined
    const emergencyCards = await trpcUtils.emergency.getEmergencyCards.ensureData(undefined);
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
        // eslint-disable-next-line unicorn/no-useless-undefined
        trpcUtils.schedule.getScheduleEntries.ensureData(undefined),
      );
      if (Array.isArray(scheduleEntries) && scheduleEntries.length > 0) {
        for (const entry of scheduleEntries) {
          if (typeof entry.id === 'string' && entry.id.length > 0) {
            trpcUtils.schedule.getById.setData({ id: entry.id }, entry);
          }
        }
        try {
          const { scheduleEntriesCollection } = await import('@/lib/tanstack-db');
          type ScheduleEntryRecord = import('@/lib/tanstack-db').ScheduleEntryRecord;

          // The localStorage collection re-serialises and rewrites the *whole* collection on
          // every mutation, so one call per entry meant hundreds of full JSON writes on the
          // main thread — with ~500 entries carrying Lexical descriptions that froze the UI
          // for the duration of a sync. Both insert() and update() take arrays, so the writes
          // are collected first and flushed at most twice.
          const syncedAt = Date.now();
          const toInsert: ScheduleEntryRecord[] = [];
          const updateKeys: string[] = [];
          const updateById = new Map<string, ScheduleEntryRecord>();

          for (const entry of scheduleEntries) {
            if (typeof entry.id !== 'string' || entry.id.length === 0) continue;

            const recordToSave = {
              ...entry,
              _syncedAt: syncedAt,
            } as unknown as ScheduleEntryRecord;
            const current = scheduleEntriesCollection.get(entry.id);

            if (current === undefined) {
              toInsert.push(recordToSave);
              continue;
            }

            // Only rewrite entries whose content actually changed. Previously the update
            // callback cleared and reassigned every key, so each entry counted as modified on
            // every sync and the full write storm ran even when nothing had changed.
            // `_syncedAt` is excluded because it changes on every sync by definition.
            if (contentFingerprint(current) === contentFingerprint(recordToSave)) continue;

            updateKeys.push(entry.id);
            updateById.set(entry.id, recordToSave);
          }

          // A batch is rejected as a unit, so one record the collection schema refuses (e.g. a
          // dangling relation) would otherwise discard every other valid record in the same
          // batch while the download still reported success - leaving the offline collection
          // stale. Fall back to per-record writes so only the offending entry is lost.
          const overwrite = (draft: Record<string, unknown>, record: object): void => {
            // The callback has to mutate the draft - TanStack DB tracks property assignments
            // and discards the returned value.
            for (const key of Object.keys(draft)) {
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete draft[key];
            }
            Object.assign(draft, record);
          };

          if (toInsert.length > 0) {
            try {
              scheduleEntriesCollection.insert(toInsert);
            } catch (error) {
              console.warn('[Offline Sync] Batched insert rejected, retrying per entry:', error);
              for (const record of toInsert) {
                try {
                  scheduleEntriesCollection.insert(record);
                } catch (entryError) {
                  console.error(
                    `[Offline Sync] Skipped schedule entry "${record.id}":`,
                    entryError,
                  );
                }
              }
            }
          }
          if (updateKeys.length > 0) {
            try {
              scheduleEntriesCollection.update(updateKeys, (drafts) => {
                for (const draft of drafts) {
                  const record = updateById.get(draft.id);
                  if (record === undefined) continue;
                  overwrite(draft, record);
                }
              });
            } catch (error) {
              console.warn('[Offline Sync] Batched update rejected, retrying per entry:', error);
              for (const key of updateKeys) {
                const record = updateById.get(key);
                if (record === undefined) continue;
                try {
                  scheduleEntriesCollection.update(key, (draft) => {
                    overwrite(draft, record);
                  });
                } catch (entryError) {
                  console.error(`[Offline Sync] Skipped schedule entry "${key}":`, entryError);
                }
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
          const CHUNK_SIZE = 40;
          const chunks = Array.from(
            { length: Math.ceil(courseIds.length / CHUNK_SIZE) },
            (_, index) => courseIds.slice(index * CHUNK_SIZE, index * CHUNK_SIZE + CHUNK_SIZE),
          );

          for (const chunk of chunks) {
            await safePrefetch(
              trpcUtils.schedule.getCourseStatuses.ensureData({ courseIds: chunk }),
            );
          }
        }
      }
    })(),
    // eslint-disable-next-line unicorn/no-useless-undefined
    safePrefetch(trpcUtils.schedule.getMyEnrollments.ensureData(undefined)),
    // eslint-disable-next-line unicorn/no-useless-undefined
    safePrefetch(trpcUtils.shifts.getMyShiftEnrollments.ensureData(undefined)),
    (async (): Promise<void> => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      const shifts = await safePrefetch(trpcUtils.schedule.getHelperShifts.ensureData(undefined));
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
    // eslint-disable-next-line unicorn/no-useless-undefined
    safePrefetch(trpcUtils.map.getAnnotations.ensureData(undefined)),
    // eslint-disable-next-line unicorn/no-useless-undefined
    safePrefetch(trpcUtils.presence.getPresence.ensureData(undefined)),
    // eslint-disable-next-line unicorn/no-useless-undefined
    safePrefetch(trpcUtils.photoContest.getContests.ensureData(undefined)),
    // eslint-disable-next-line unicorn/no-useless-undefined
    safePrefetch(trpcUtils.chat.getFeatureFlags.ensureData(undefined)),
  ]);
};
