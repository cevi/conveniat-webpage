import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { BillingLogger } from '@/features/billing/ports/logger.port';
import type { HofSyncWrite, SettingsPort } from '@/features/billing/ports/settings.port';
import { flattenHofEvents } from '@/features/billing/services/hof-events';
import type { HofEventRow } from '@/features/billing/types';
import { isAufbauOrAbbaulager } from '@/features/billing/utils';
import { deriveHofName } from '@/features/payload-cms/payload-cms/utils/hof-name';
import type { Hof } from '@/features/payload-cms/payload-types';

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
  foundEvents: HofEventRow[];
}

export type PopulateSubeventsProgressHandler = (
  progress: PopulateSubeventsProgress,
) => void | Promise<void>;

const PARENT_GROUP_ID = '4337';
const CONCURRENCY_LIMIT = 3;
const MAX_ATTEMPTS = 3;

type StoredHof = Pick<Hof, 'name' | 'groupId' | 'events'> &
  Partial<Pick<Hof, 'addressManagerEmails' | 'reminderRecipientsOverride'>>;

interface WorkingHof {
  name: string;
  groupId: string;
  events: Array<{ eventId: string; eventName: string }>;
  addressManagerEmails?: string | null | undefined;
  reminderRecipientsOverride?: string | null | undefined;
}

/** What a sync write would change on a Hof, to tell the Höfe it has to touch from the rest. */
const syncedState = (hof: Pick<WorkingHof, 'events' | 'addressManagerEmails'>): string =>
  JSON.stringify({
    events: hof.events.map(({ eventId, eventName }) => ({ eventId, eventName })),
    addressManagerEmails: hof.addressManagerEmails ?? '',
  });

/**
 * Merges the events a walk found into the stored Höfe.
 *
 * A known Hof keeps its document — most of all its name and `reminderRecipientsOverride`,
 * which an editor set by hand and a sync must never wipe — and has every field Cevi.DB owns
 * refreshed: the names of its events, new events appended, and its address managers unless
 * their lookup failed. A group without a Hof gets one, named after its first event.
 *
 * Aufbau- and Abbaulager events are dropped from the stored Höfe as well, the same rule the
 * walk applies to what it finds.
 *
 * @returns the Höfe to write — only those the walk changed —, the events no Hof held before,
 *   and every event of every Hof after the merge
 */
export function mergeWalkIntoHoefe(
  stored: readonly StoredHof[],
  walked: readonly HofEventRow[],
): { writes: HofSyncWrite[]; newEvents: HofEventRow[]; allEvents: HofEventRow[] } {
  const hoefe = new Map<string, WorkingHof>();
  const storedState = new Map<string, string>();
  const knownEventIds = new Set<string>();

  for (const hof of stored) {
    const events = (hof.events ?? []).map(({ eventId, eventName }) => ({ eventId, eventName }));
    storedState.set(hof.groupId, syncedState({ ...hof, events }));
    for (const event of events) knownEventIds.add(event.eventId);
    hoefe.set(hof.groupId, {
      name: hof.name,
      groupId: hof.groupId,
      events: events.filter((event) => !isAufbauOrAbbaulager(event.eventName)),
      addressManagerEmails: hof.addressManagerEmails,
      reminderRecipientsOverride: hof.reminderRecipientsOverride,
    });
  }

  const newEvents: HofEventRow[] = [];
  const refreshedAddresses = new Map<string, string>();

  for (const row of walked) {
    // Cevi.DB now lists the event under another group, so it moves to that group's Hof. The
    // Hof it leaves stays, even when empty: other areas may point at it.
    for (const hof of hoefe.values()) {
      if (hof.groupId !== row.groupId)
        hof.events = hof.events.filter((event) => event.eventId !== row.eventId);
    }

    let hof = hoefe.get(row.groupId);
    if (hof === undefined) {
      const groupEventNames = walked
        .filter((candidate) => candidate.groupId === row.groupId)
        .map((candidate) => candidate.eventName);
      hof = { name: deriveHofName(groupEventNames, row.groupId), groupId: row.groupId, events: [] };
      hoefe.set(row.groupId, hof);
    }

    const existing = hof.events.find((event) => event.eventId === row.eventId);
    if (existing === undefined) {
      hof.events.push({ eventId: row.eventId, eventName: row.eventName });
      if (!knownEventIds.has(row.eventId)) newEvents.push(row);
    } else {
      // The name lives in Cevi.DB, and it is what the bills, the exports and the reminder
      // mails print.
      existing.eventName = row.eventName;
    }

    // Left undefined by the walk when the lookup failed, which keeps the stored list.
    if (row.addressManagerEmails !== undefined) {
      hof.addressManagerEmails = row.addressManagerEmails;
      refreshedAddresses.set(row.groupId, row.addressManagerEmails);
    }
  }

  const writes: HofSyncWrite[] = [];
  for (const hof of hoefe.values()) {
    hof.events.sort((a, b) => a.eventName.localeCompare(b.eventName));
    if (storedState.get(hof.groupId) === syncedState(hof)) continue;

    const addressManagerEmails = refreshedAddresses.get(hof.groupId);
    writes.push({
      groupId: hof.groupId,
      name: hof.name,
      events: hof.events,
      ...(addressManagerEmails === undefined ? {} : { addressManagerEmails }),
    });
  }

  const allEvents = flattenHofEvents([...hoefe.values()]).sort((a, b) =>
    a.eventName.localeCompare(b.eventName),
  );

  return { writes, newEvents, allEvents };
}

/**
 * Fetches every subgroup of the conveniat27 parent group from Cevi.DB, collects the
 * matching events and merges them into the Höfe, one Hof per subgroup.
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
  /** The events that no Hof held before this run. */
  newEvents: HofEventRow[];
  /** Every event of every Hof once the walk is written, new and pre-existing alike. */
  allEvents: HofEventRow[];
}> {
  logger.info('Fetching the subgroups of the conveniat27 parent group from Cevi.DB', {
    'billing.parent_group_id': PARENT_GROUP_ID,
  });
  const subgroupLinks = await hitobitoService.fetchSubgroupLinks(PARENT_GROUP_ID);
  logger.info('Walking the subgroups for their conveniat27 events', {
    'billing.parent_group_id': PARENT_GROUP_ID,
    'billing.total_groups': subgroupLinks.length,
  });

  const results: HofEventRow[] = [];

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

  const executeBatch = async (ids: string[]): Promise<HofEventRow[]> => {
    const batchResults: HofEventRow[] = [];

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

  const storedHoefe = await settingsRepo.getHoefe();
  const { writes, newEvents, allEvents } = mergeWalkIntoHoefe(storedHoefe, results);

  logger.info('Writing the walked events to the Höfe', {
    'billing.total_groups': subgroupLinks.length,
    'billing.events_found': results.length,
    'billing.events_new': newEvents.length,
    'billing.events_stored': allEvents.length,
    'billing.hoefe_written': writes.length,
  });

  await settingsRepo.upsertHoefe(writes);

  return { success: true, count: newEvents.length, newEvents, allEvents };
}
