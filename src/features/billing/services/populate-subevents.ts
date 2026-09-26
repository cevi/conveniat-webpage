import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { BillingLogger } from '@/features/billing/ports/logger.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type { PopulatedSubevent } from '@/features/billing/types';
import { isAufbauOrAbbaulager } from '@/features/billing/utils';
import { decodeDisplayText } from '@/features/registration_process/hitobito-api/html-parser';

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
  logger: BillingLogger,
  onProgress?: PopulateSubeventsProgressHandler,
): Promise<{
  success: boolean;
  count: number;
  /** The events that were not in the settings before this run. */
  newEvents: PopulatedSubevent[];
  /** The full list as written to the settings, new and pre-existing events alike. */
  allEvents: PopulatedSubevent[];
}> {
  logger.info('Fetching the subgroups of the conveniat27 parent group from Cevi.DB', {
    'billing.parent_group_id': PARENT_GROUP_ID,
  });
  const subgroupLinks = await hitobitoService.fetchSubgroupLinks(PARENT_GROUP_ID);
  logger.info('Walking the subgroups for their conveniat27 events', {
    'billing.parent_group_id': PARENT_GROUP_ID,
    'billing.total_groups': subgroupLinks.length,
  });

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
  const withRetry = async <T>(
    what: string,
    groupId: string,
    attempt: () => Promise<T>,
  ): Promise<T | undefined> => {
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
          // The one line in this walk that needs a human: the group is skipped, and a skipped
          // group is the difference between "this Hof has no events" and "we never asked".
          logger.warn('Giving up on a Cevi.DB lookup', {
            'billing.lookup': what,
            'billing.group_id': groupId,
            'billing.attempts': attempts,
            error,
          });
          return undefined;
        }

        const backoffMs = attempts * 500;
        // Debug, not info: a busy Cevi.DB makes this fire several times per group, and the
        // retry that succeeds is not news. The give-up above is.
        logger.debug('Retrying a Cevi.DB lookup', {
          'billing.lookup': what,
          'billing.group_id': groupId,
          'billing.attempt': attempts,
          'billing.max_attempts': MAX_ATTEMPTS,
          'billing.backoff_ms': backoffMs,
          error,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    return undefined;
  };

  const executeBatch = async (ids: string[]): Promise<PopulatedSubevent[]> => {
    const batchResults: PopulatedSubevent[] = [];

    await Promise.all(
      ids.map(async (groupId) => {
        const events = await withRetry('events', groupId, () =>
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
        const addressManagers = await withRetry('address managers', groupId, () =>
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

    const processedGroups = Math.min(index + chunk.length, subgroupLinks.length);

    // One line per batch, at debug. The walk takes around 45 seconds and the request can be
    // cut off at any point in it — by the browser, or by a replica being replaced mid-sweep.
    // Without these, a run that died halfway leaves the same evidence as one that never
    // started: the opening line and nothing else.
    logger.debug('Walked a batch of subgroups', {
      'billing.processed_groups': processedGroups,
      'billing.total_groups': subgroupLinks.length,
      'billing.events_found': results.length,
    });

    await onProgress?.({
      processedGroups,
      totalGroups: subgroupLinks.length,
      foundEvents: batchResults,
    });

    // Wait 150ms between batches to stay within rate limits
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // Fetch existing settings to merge rather than overwriting
  const settings = await settingsRepo.getBillSettings();
  const existingEvents = Array.isArray(settings.events) ? settings.events : [];

  // Filter out any Aufbau- or Abbaulager events from pre-existing settings, and decode the
  // rows that were written before the names were decoded on the way in. Without this an
  // already known Hof keeps its `&amp;` forever, because the merge below leaves the name of
  // an existing row alone.
  const filteredExistingEvents = existingEvents
    .filter((event) => !isAufbauOrAbbaulager(event.eventName))
    .map((event) =>
      // Legacy rows exist with no name at all; those stay exactly as they are.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      typeof event.eventName === 'string'
        ? { ...event, eventName: decodeDisplayText(event.eventName) }
        : event,
    );

  // Merge new results into filteredExistingEvents, using eventId as the key. A known event
  // keeps its row — most of all its `reminderRecipientsOverride`, which an editor set by
  // hand and which a sync must never wipe — and has every field Cevi.DB owns refreshed.
  const mergedEvents = [...filteredExistingEvents];
  const newEvents: PopulatedSubevent[] = [];
  for (const newEvent of results) {
    const existingIndex = mergedEvents.findIndex(
      (existingEvent) => existingEvent.eventId === newEvent.eventId,
    );
    if (existingIndex === -1) {
      mergedEvents.push(newEvent);
      newEvents.push(newEvent);
    } else {
      // The name and the group live in Cevi.DB, so a Hof renamed or moved there has to
      // reach the stored row: it is what the bills, the exports, the reminder mails and
      // the participation sync read. `addressManagerEmails` is the one synced field that
      // keeps its stored value when the lookup failed, see `withRetry` above.
      mergedEvents[existingIndex] = {
        ...mergedEvents[existingIndex],
        eventName: newEvent.eventName,
        groupId: newEvent.groupId,
        ...(newEvent.addressManagerEmails === undefined
          ? {}
          : { addressManagerEmails: newEvent.addressManagerEmails }),
      } as (typeof mergedEvents)[number];
    }
  }

  // Sort merged events by eventName for clean structure in the UI
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  mergedEvents.sort((a, b) => (a.eventName ?? '').localeCompare(b.eventName ?? ''));

  logger.info('Writing the walked events to the bill settings', {
    'billing.total_groups': subgroupLinks.length,
    'billing.events_found': results.length,
    'billing.events_new': newEvents.length,
    'billing.events_stored': mergedEvents.length,
  });

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
