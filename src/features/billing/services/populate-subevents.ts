import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type { PopulatedSubevent } from '@/features/billing/types';
import { isAufbauOrAbbaulager } from '@/features/billing/utils';

/**
 * Progress emitted while the subgroups of the parent group are walked.
 *
 * `processedGroups` / `totalGroups` drive the progress bar; `foundEvents` carries the
 * events discovered since the previous update so the caller can append them to a list
 * instead of re-rendering the whole set on every tick.
 */
export interface PopulateSubeventsProgress {
  processedGroups: number;
  totalGroups: number;
  foundEvents: PopulatedSubevent[];
}

export type PopulateSubeventsProgressHandler = (
  progress: PopulateSubeventsProgress,
) => void | Promise<void>;

const PARENT_GROUP_ID = '4337';
const CONCURRENCY_LIMIT = 3;
const MAX_ATTEMPTS = 3;

/**
 * Fetches every subgroup of the conveniat27 parent group from Cevi.DB, collects the
 * matching events and merges them into the bill settings.
 *
 * @param onProgress optional callback invoked after every finished batch of subgroups.
 *   The walk is the slow part (~45s), so this is what a caller streams to the admin UI.
 */
export async function populateSubeventsUseCase(
  hitobitoService: HitobitoServicePort,
  settingsRepo: SettingsPort,
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  },
  onProgress?: PopulateSubeventsProgressHandler,
): Promise<{
  success: boolean;
  count: number;
  /** The events that were not in the settings before this run. */
  newEvents: PopulatedSubevent[];
  /** The full list as written to the settings, new and pre-existing events alike. */
  allEvents: PopulatedSubevent[];
}> {
  logger.info(`Fetching subgroups of parent group ${PARENT_GROUP_ID} from Cevi.DB...`);
  const subgroupLinks = await hitobitoService.fetchSubgroupLinks(PARENT_GROUP_ID);
  logger.info(`Found ${subgroupLinks.length} subgroups. Querying events...`);

  const results: PopulatedSubevent[] = [];

  await onProgress?.({
    processedGroups: 0,
    totalGroups: subgroupLinks.length,
    foundEvents: [],
  });

  /**
   * Runs `attempt` until it succeeds or the retries are used up. Cevi.DB answers 503 and
   * 429 under load, so a single failed call says nothing about the group.
   *
   * @returns the value, or `undefined` once the attempts are exhausted or the failure was
   * not transient. The caller decides what an unknown answer means.
   */
  const withRetry = async <T>(what: string, attempt: () => Promise<T>): Promise<T | undefined> => {
    let attempts = 0;
    while (attempts < MAX_ATTEMPTS) {
      try {
        return await attempt();
      } catch (error: unknown) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isTransient =
          errorMessage.includes('503') ||
          errorMessage.includes('429') ||
          errorMessage.toLowerCase().includes('timeout');

        if (attempts >= MAX_ATTEMPTS || !isTransient) {
          logger.warn(`Failed to fetch ${what}: ${errorMessage}`);
          return undefined;
        }

        const backoffMs = attempts * 500;
        logger.info(
          `Rate limited/Error 503 for ${what}. Retrying (attempt ${attempts}/${MAX_ATTEMPTS}) in ${backoffMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    return undefined;
  };

  const executeBatch = async (ids: string[]): Promise<PopulatedSubevent[]> => {
    const batchResults: PopulatedSubevent[] = [];

    await Promise.all(
      ids.map(async (groupId) => {
        const events = await withRetry(`events for group ${groupId}`, () =>
          hitobitoService.fetchEventsForGroup(groupId),
        );
        if (events === undefined) return;

        const matching = events.filter(
          (event) =>
            !isAufbauOrAbbaulager(event.name) &&
            typeof event.name === 'string' &&
            (event.name.includes('Hauptlager conveniat27') || event.name.includes('conveniat27')),
        );
        if (matching.length === 0) return;

        // Once per group, not once per event: a Hof usually runs several events and the
        // Adressverwalter are a property of its group.
        const addressManagers = await withRetry(`address managers for group ${groupId}`, () =>
          hitobitoService.fetchAddressManagerEmails(groupId),
        );

        for (const event of matching) {
          batchResults.push({
            eventId: event.id,
            eventName: event.name,
            groupId: groupId,
            // Left undefined when the fetch failed, which is what keeps the merge below
            // from replacing a good stored list with an empty one.
            ...(addressManagers === undefined
              ? {}
              : { addressManagerEmails: addressManagers.join(', ') }),
          });
        }
      }),
    );

    return batchResults;
  };

  for (let index = 0; index < subgroupLinks.length; index += CONCURRENCY_LIMIT) {
    const chunk = subgroupLinks.slice(index, index + CONCURRENCY_LIMIT);
    const batchResults = await executeBatch(chunk);
    results.push(...batchResults);

    await onProgress?.({
      processedGroups: Math.min(index + chunk.length, subgroupLinks.length),
      totalGroups: subgroupLinks.length,
      foundEvents: batchResults,
    });

    // Wait 150ms between batches to stay within rate limits
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Fetch existing settings to merge rather than overwriting
  const settings = await settingsRepo.getBillSettings();
  const existingEvents = Array.isArray(settings.events) ? settings.events : [];

  // Filter out any Aufbau- or Abbaulager events from pre-existing settings
  const filteredExistingEvents = existingEvents.filter(
    (event) => !isAufbauOrAbbaulager(event.eventName),
  );

  // Merge new results into filteredExistingEvents, using eventId as the key. A known event
  // keeps its row — most of all its `reminderRecipientsOverride`, which an editor set by
  // hand and which a sync must never wipe — and only has its synced Adressverwalter
  // refreshed.
  const mergedEvents = [...filteredExistingEvents];
  const newEvents: PopulatedSubevent[] = [];
  for (const newEvent of results) {
    const existingIndex = mergedEvents.findIndex(
      (existingEvent) => existingEvent.eventId === newEvent.eventId,
    );
    if (existingIndex === -1) {
      mergedEvents.push(newEvent);
      newEvents.push(newEvent);
    } else if (newEvent.addressManagerEmails !== undefined) {
      mergedEvents[existingIndex] = {
        ...mergedEvents[existingIndex],
        addressManagerEmails: newEvent.addressManagerEmails,
      } as (typeof mergedEvents)[number];
    }
  }

  // Sort merged events by eventName for clean structure in the UI
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  mergedEvents.sort((a, b) => (a.eventName ?? '').localeCompare(b.eventName ?? ''));

  logger.info(
    `Found ${results.length} matching events (${String(newEvents.length)} new). Updating global settings...`,
  );

  await settingsRepo.updateBillSettingsEvents(mergedEvents);

  return {
    success: true,
    count: newEvents.length,
    newEvents,
    // Stripped of the Payload row `id`, which the settings form re-creates anyway.
    allEvents: mergedEvents.map(
      ({ eventId, eventName, groupId, addressManagerEmails, reminderRecipientsOverride }) => ({
        eventId,
        eventName,
        groupId,
        ...(addressManagerEmails === undefined || addressManagerEmails === null
          ? {}
          : { addressManagerEmails }),
        ...(reminderRecipientsOverride === undefined || reminderRecipientsOverride === null
          ? {}
          : { reminderRecipientsOverride }),
      }),
    ),
  };
}
