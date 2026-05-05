import type { SyncedParticipant, SyncSummary } from '@/features/billing/types';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { EventService } from '@/features/registration_process/hitobito-api/services/event.service';
import type { Payload } from 'payload';

interface BillSettingsEvent {
  eventId: string;
  eventName: string;
  groupId: string;
}

interface SyncHistoryEntry {
  date: string;
  action: string;
  diff?: Record<string, { from: string; to: string }>;
}

/**
 * Syncs event participations from the Cevi.DB with the local bill-participants collection.
 *
 * Handles the following state transitions:
 * - New participation: creates a new record with status 'new'
 * - Existing participation: updates lastSyncDate
 * - Missing participation: sets status 'removed', sets removedDate
 * - Re-added user: creates new record with status 're_added' (same userId, different participationUuid)
 */
export async function syncParticipants(payload: Payload): Promise<SyncSummary> {
  const now = new Date().toISOString();
  const summary: SyncSummary = {
    newCount: 0,
    removedCount: 0,
    reAddedCount: 0,
    changedCount: 0,
    unchangedCount: 0,
    syncDate: now,
    errors: [],
  };

  // 1. Load bill settings
  const settings = await payload.findGlobal({
    slug: 'bill-settings',
    context: { internal: true },
  });

  const events = (settings.events as BillSettingsEvent[] | undefined) ?? [];
  if (events.length === 0) {
    summary.errors.push('No events configured in Bill Settings.');
    return summary;
  }

  // 2. Create Hitobito client (token-only, no browser cookie needed)
  const logger = {
    info: (message: string): void => {
      payload.logger.info(message);
    },
    warn: (message: string): void => {
      payload.logger.warn(message);
    },
    error: (message: string): void => {
      payload.logger.error(message);
    },
  };

  const client = new HitobitoClient(
    {
      baseUrl: HITOBITO_CONFIG.baseUrl,
      apiToken: HITOBITO_CONFIG.apiToken,
      browserCookie: '', // Not needed for JSON:API endpoints
    },
    logger,
  );
  const eventService = new EventService(client, logger);

  // 3. Fetch participations for each event
  for (const event of events) {
    try {
      const participations = await eventService.listEventParticipations(event.eventId);
      const fetchedParticipationIds = new Set<string>();

      for (const participation of participations) {
        fetchedParticipationIds.add(participation.participationId);

        // Check if this participation already exists
        const existing = await payload.find({
          collection: 'bill-participants',
          context: { internal: true },
          where: {
            participationUuid: { equals: participation.participationId },
          },
          limit: 1,
        });

        if (existing.docs.length > 0) {
          // Already known → check if properties changed
          const document_ = existing.docs[0];
          if (document_ === undefined) continue;

          const normalize = (val: unknown): string => (typeof val === 'string' ? val : '');
          const hasRoleChanged =
            normalize(document_.roleType) !== normalize(participation.roleType);
          const hasNameChanged =
            normalize(document_.fullName) !== normalize(participation.fullName);
          const hasFirstNameChanged =
            normalize(document_.firstName) !== normalize(participation.firstName);
          const hasLastNameChanged =
            normalize(document_.lastName) !== normalize(participation.lastName);
          const hasNicknameChanged =
            normalize(document_.nickname) !== normalize(participation.nickname);
          const hasGroupIdChanged = normalize(document_.groupId) !== normalize(event.groupId);

          const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];

          if (
            hasRoleChanged ||
            hasNameChanged ||
            hasFirstNameChanged ||
            hasLastNameChanged ||
            hasNicknameChanged ||
            hasGroupIdChanged
          ) {
            const diff: Record<string, { from: string; to: string }> = {};
            if (hasRoleChanged)
              diff['roleType'] = {
                from: String(document_.roleType),
                to: participation.roleType,
              };
            if (hasFirstNameChanged)
              diff['firstName'] = {
                from: String(document_.firstName),
                to: participation.firstName,
              };
            if (hasLastNameChanged)
              diff['lastName'] = {
                from: String(document_.lastName),
                to: participation.lastName,
              };
            if (hasNicknameChanged)
              diff['nickname'] = {
                from: String(document_.nickname),
                to: participation.nickname,
              };
            if (hasNameChanged)
              diff['fullName'] = {
                from: String(document_.fullName),
                to: participation.fullName,
              };
            if (hasGroupIdChanged)
              diff['groupId'] = { from: String(document_.groupId), to: event.groupId };

            await payload.update({
              collection: 'bill-participants',
              context: { internal: true },
              id: document_.id,
              data: {
                lastSyncDate: now,
                groupId: event.groupId,
                firstName: participation.firstName,
                lastName: participation.lastName,
                nickname: participation.nickname,
                fullName: participation.fullName,
                roleType: participation.roleType,
                status: 'updated',
                syncHistory: [...history, { date: now, action: 'participant_updated', diff }],
              },
            });
            summary.changedCount++;
          } else {
            await payload.update({
              collection: 'bill-participants',
              context: { internal: true },
              id: document_.id,
              data: {
                lastSyncDate: now,
                syncHistory: [...history, { date: now, action: 'sync_confirmed' }],
              },
            });
            summary.unchangedCount++;
          }
        } else {
          // Check if this is a re-added user (same userId+eventId, different participationUuid)
          const previousForUser = await payload.find({
            collection: 'bill-participants',
            context: { internal: true },
            where: {
              and: [
                { userId: { equals: participation.participantId } },
                { eventId: { equals: event.eventId } },
                { status: { equals: 'removed' } },
              ],
            },
            limit: 1,
          });

          const isReAdded = previousForUser.docs.length > 0;
          const newParticipant: SyncedParticipant = {
            participationUuid: participation.participationId,
            userId: participation.participantId,
            eventId: event.eventId,
            groupId: event.groupId,
            firstName: participation.firstName,
            lastName: participation.lastName,
            nickname: participation.nickname,
            fullName: participation.fullName,
            roleType: participation.roleType,
            enrollmentDate: participation.enrollmentDate,
          };

          await payload.create({
            collection: 'bill-participants',
            context: { internal: true },
            data: {
              ...newParticipant,
              firstSyncDate: now,
              lastSyncDate: now,
              status: isReAdded ? 're_added' : 'new',
              // eslint-disable-next-line unicorn/no-null -- Payload date fields require null, not undefined
              reAddedDate: isReAdded ? now : null,
              syncHistory: [{ date: now, action: isReAdded ? 're_added_detected' : 'first_sync' }],
            },
          });

          if (isReAdded) {
            summary.reAddedCount++;
          } else {
            summary.newCount++;
          }
        }
      }

      // 4. Detect removed participations (in DB but not in API response)
      const allExistingForEvent = await payload.find({
        collection: 'bill-participants',
        context: { internal: true },
        where: {
          and: [{ eventId: { equals: event.eventId } }, { status: { not_equals: 'removed' } }],
        },
        limit: 10_000,
      });

      for (const document_ of allExistingForEvent.docs) {
        const participationUuid = document_.participationUuid;
        if (!fetchedParticipationIds.has(participationUuid)) {
          const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
          await payload.update({
            collection: 'bill-participants',
            context: { internal: true },
            id: document_.id,
            data: {
              status: 'removed',
              removedDate: now,
              lastSyncDate: now,
              syncHistory: [...history, { date: now, action: 'removed_detected' }],
            },
          });
          summary.removedCount++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.errors.push(`Event ${event.eventId} (${event.eventName}): ${errorMessage}`);
    }
  }

  payload.logger.info(
    `Sync complete: ${String(summary.newCount)} new, ${String(summary.removedCount)} removed, ${String(summary.reAddedCount)} re-added, ${String(summary.changedCount)} changed, ${String(summary.unchangedCount)} unchanged`,
  );

  return summary;
}
