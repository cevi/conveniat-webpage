/* eslint-disable unicorn/no-null */
import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { PayloadParticipantRepositoryAdapter } from '@/features/billing/adapters/payload-participant-repository.adapter';
import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import {
  ANMELDESTATUS_WRITTEN_ACTION,
  needsAnmeldestatusWriteBack,
  writeBackAnmeldestatus,
} from '@/features/billing/services/anmeldestatus-writeback';
import {
  hasRaisedBill,
  NEEDS_MANUAL_REVIEW,
  resolveSyncStatus,
} from '@/features/billing/services/billing-status';
import { CEVIDB_SESSION_EXPIRED_MESSAGE } from '@/features/billing/services/cevidb-session';
import type { JobProgressReporter } from '@/features/billing/services/job-progress-reporter';
import { isRoleAllowed, validateParticipant } from '@/features/billing/services/validation-service';
import type { SyncSummary } from '@/features/billing/types';
import { BillingTaskSlug } from '@/features/billing/types';
import { isAufbauOrAbbaulager } from '@/features/billing/utils';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import { SessionExpiredError } from '@/features/registration_process/hitobito-api/errors';
import { traceFunction, withSpan } from '@/utils/tracing-helpers';
import { randomUUID } from 'node:crypto';
import type { Payload } from 'payload';

interface BillSettingsEvent {
  eventId: string;
  eventName?: string | null;
  groupId: string;
}

interface SyncHistoryEntry {
  date: string;
  action: string;
  diff?: Record<string, { from: string; to: string }>;
  /** The value written back to the Cevi.DB. */
  value?: string;
  /** Why an already-billed row was parked for manual inspection. */
  reviewReason?: string;
}

/** What the sync needs of a logger; `debug` is absent in the unit tests. */
interface SyncLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

/** Statuses whose bill has left the house, so the Cevi.DB must read "Rechnung gestellt". */
const BILL_IS_OUT_STATUSES = new Set(['bill_sent', 'reminder_sent']);

/**
 * Below this many active registrations, a large proportional drop says nothing — losing
 * one of two participants is 50% and entirely ordinary.
 */
const MIN_PARTICIPANTS_FOR_DROP_GUARD = 5;

/** A single sync removing more of an event than this is treated as a bad read. */
const MAX_REMOVED_FRACTION_PER_SYNC = 0.5;

/** How long a sync run may hold its lock before it is assumed dead. */
const RUN_LOCK_TTL_SECONDS = 2 * 60 * 60;

/** Cevi.DB keys the answers by the question text, which editors reword, so we match loosely. */
function findAnswer(
  answers: Record<string, string>,
  questionKeywords: string[],
): string | undefined {
  const entry = Object.entries(answers).find(([qText]) =>
    questionKeywords.every((kw) => qText.toLowerCase().includes(kw.toLowerCase())),
  );
  return entry?.[1];
}

function findInvoiceEmail(answers: Record<string, string>): string | null {
  return (
    findAnswer(answers, ['mailadresse', 'rechnung']) ??
    findAnswer(answers, ['e-mail', 'rechnung']) ??
    null
  );
}

/** The "Administrationsangaben » Anmeldestatus" answer, e.g. "erfasst durch AVP". */
function findAnmeldestatus(answers: Record<string, string>): string | null {
  return findAnswer(answers, ['anmeldestatus']) ?? null;
}

/**
 * Synchronizes event participations for a single event using Ports.
 */
async function syncSingleEvent(
  event: BillSettingsEvent,
  hitobitoService: HitobitoServicePort,
  participantRepo: ParticipantRepositoryPort,
  now: string,
  summary: SyncSummary,
  rolePricingPatterns: string[],
  logger: SyncLogger,
): Promise<void> {
  const participations = await hitobitoService.fetchParticipations(event.groupId, event.eventId);
  const fetchedParticipationIds = new Set<string>();

  for (const participation of participations) {
    fetchedParticipationIds.add(participation.participationId);

    if (participation.participantId.length === 0) {
      summary.errors.push(
        `Teilnahme ${participation.participationId} konnte nicht synchronisiert werden: Personen-ID fehlt. Bitte stelle sicher, dass ein gültiger Browser-Cookie in den Registrierungs-Einstellungen eingetragen ist.`,
      );
      continue;
    }

    // Fetch custom answers for custom questions verification
    const answers = await withSpan(
      `syncParticipants:fetchAnswers:${participation.participationId}`,
      async (span) => {
        const answersResult = await hitobitoService.fetchParticipationAnswers(
          participation.eventId,
          participation.participationId,
          event.groupId,
        );
        span.setAttributes({
          'participant.id': participation.participantId,
          'participation.id': participation.participationId,
          'answers.count': Object.keys(answersResult).length,
        });
        return answersResult;
      },
    );

    // Validate the participant using the verification service component
    const validationResult = await withSpan(
      `syncParticipants:validate:${participation.participationId}`,
      async (span) => {
        await Promise.resolve();
        const input = {
          person: {
            firstName: participation.firstName,
            lastName: participation.lastName,
            nickname: participation.nickname,
            street: participation.street,
            housenumber: participation.housenumber,
            zipCode: participation.zipCode,
            town: participation.town,
            country: participation.country,
            gender: participation.gender,
            birthday: participation.birthday,
          },
          answers,
        };
        const validatedOutput = validateParticipant(input);
        // Which fields are missing is on the span below and on the participant record
        // itself; a `console.log` of it on every invalid registration was debug output
        // that shipped.
        span.setAttributes({
          'participant.id': participation.participantId,
          'participation.id': participation.participationId,
          'validation.isValid': validatedOutput.isValid,
          'validation.missingFields': validatedOutput.missingFields,
        });
        return validatedOutput;
      },
    );

    const invoiceEmail = findInvoiceEmail(answers);
    const anmeldestatus = findAnmeldestatus(answers);

    // Check if this participation already exists
    const existing = await participantRepo.findByParticipationUuid(participation.participationId);

    if (existing === null) {
      // Check if this is a re-added user (same userId+eventId, different participationUuid)
      const previousForUser = await participantRepo.findRemovedParticipant(
        participation.participantId,
        event.eventId,
      );

      const isReAdded = previousForUser !== null;
      const newParticipant = {
        participationUuid: participation.participationId,
        userId: participation.participantId,
        eventId: event.eventId,
        groupId: event.groupId,
        eventName: event.eventName ?? '',
        firstName: participation.firstName,
        lastName: participation.lastName,
        nickname: participation.nickname,
        fullName: participation.fullName,
        roleType: participation.roleType,
        enrollmentDate: participation.enrollmentDate,
        street: participation.street ?? null,
        zip: participation.zip ?? null,
        zipCode: participation.zipCode ?? null,
        town: participation.town ?? null,
        email: invoiceEmail,
        anmeldestatus,
        birthday: participation.birthday ?? null,
        gender: participation.gender ?? null,
        active: participation.active,
      };

      const isRoleOk = isRoleAllowed(participation.roleType, rolePricingPatterns);
      const isMissing = !validationResult.isValid;
      let finalStatus = isReAdded ? 're_added' : 'new';
      if (!isRoleOk) {
        finalStatus = 'invalid_anmeldeangaben';
      } else if (isMissing) {
        finalStatus = 'pflichtangaben_missing';
      }

      await participantRepo.create({
        ...newParticipant,
        firstSyncDate: now,
        lastSyncDate: now,
        status: finalStatus as never,
        reAddedDate: isReAdded ? now : null,
        missingStammdaten: validationResult.missingStammdaten,
        missingAnmeldeangaben: validationResult.missingAnmeldeangaben,
        syncHistory: [{ date: now, action: isReAdded ? 're_added_detected' : 'first_sync' }],
      });

      if (isReAdded) {
        summary.reAddedCount++;
      } else {
        summary.newCount++;
      }
    } else {
      // Already known → check if properties changed
      const document_ = existing;

      // Reverse state for a write-back that never landed: once a bill has been mailed the
      // Cevi.DB must read "Rechnung gestellt". If it does not, the write-back at send time
      // failed (or somebody set the answer back), so it is retried once here. The retried
      // value is what the comparison below sees, so a successful retry is not also
      // reported as an incoming change.
      let effectiveAnmeldestatus: string | null = anmeldestatus;
      let wroteAnmeldestatus = false;
      const writeBackEntries: SyncHistoryEntry[] = [];
      if (
        BILL_IS_OUT_STATUSES.has(String(document_.status)) &&
        needsAnmeldestatusWriteBack(anmeldestatus)
      ) {
        const writeBack = await writeBackAnmeldestatus(
          hitobitoService,
          {
            groupId: event.groupId,
            eventId: event.eventId,
            participationUuid: participation.participationId,
            fullName: participation.fullName,
            anmeldestatus,
          },
          now,
          logger,
        );
        effectiveAnmeldestatus = writeBack.anmeldestatus ?? null;
        wroteAnmeldestatus = writeBack.historyEntries.some(
          (entry) => entry.action === ANMELDESTATUS_WRITTEN_ACTION,
        );
        writeBackEntries.push(...writeBack.historyEntries);
        if (writeBack.error !== undefined) {
          summary.errors.push(writeBack.error);
          // Same reverse state as a missing cookie: only the settings can clear it.
          if (writeBack.cookieInvalid === true)
            summary.relatedDocuments = ['registrationManagement'];
        }
      }

      const normalize = (val: unknown): string => (typeof val === 'string' ? val : '');
      const hasRoleChanged = normalize(document_.roleType) !== normalize(participation.roleType);
      const hasNameChanged = normalize(document_.fullName) !== normalize(participation.fullName);
      const hasFirstNameChanged =
        normalize(document_.firstName) !== normalize(participation.firstName);
      const hasLastNameChanged =
        normalize(document_.lastName) !== normalize(participation.lastName);
      const hasNicknameChanged =
        normalize(document_.nickname) !== normalize(participation.nickname);
      const hasGroupIdChanged = normalize(document_.groupId) !== normalize(event.groupId);
      const hasEventNameChanged = normalize(document_.eventName) !== normalize(event.eventName);

      const hasStreetChanged = normalize(document_.street) !== normalize(participation.street);
      const hasZipChanged = normalize(document_.zip) !== normalize(participation.zip);
      const hasZipCodeChanged = normalize(document_.zipCode) !== normalize(participation.zipCode);
      const hasTownChanged = normalize(document_.town) !== normalize(participation.town);
      const hasEmailChanged = normalize(document_.email) !== normalize(invoiceEmail);
      // A value this run wrote itself is not an incoming change: counting it would park
      // every billed row for manual review and log a diff of our own making. The
      // `anmeldestatus_written_to_cevidb` entry already records it.
      const hasAnmeldestatusChanged =
        !wroteAnmeldestatus &&
        normalize(document_.anmeldestatus) !== normalize(effectiveAnmeldestatus);
      const hasBirthdayChanged =
        normalize(document_.birthday) !== normalize(participation.birthday);
      const hasGenderChanged = normalize(document_.gender) !== normalize(participation.gender);
      const hasActiveChanged = Boolean(document_.active) !== Boolean(participation.active);

      const hasMissingStammdatenChanged =
        JSON.stringify(document_.missingStammdaten ?? []) !==
        JSON.stringify(validationResult.missingStammdaten);
      const hasMissingAnmeldeangabenChanged =
        JSON.stringify(document_.missingAnmeldeangaben ?? []) !==
        JSON.stringify(validationResult.missingAnmeldeangaben);

      const isRoleOk = isRoleAllowed(participation.roleType, rolePricingPatterns);
      const isMissing = !validationResult.isValid;

      const hasChanges =
        hasRoleChanged ||
        hasNameChanged ||
        hasFirstNameChanged ||
        hasLastNameChanged ||
        hasNicknameChanged ||
        hasGroupIdChanged ||
        hasEventNameChanged ||
        hasStreetChanged ||
        hasZipChanged ||
        hasZipCodeChanged ||
        hasTownChanged ||
        hasEmailChanged ||
        hasAnmeldestatusChanged ||
        hasBirthdayChanged ||
        hasGenderChanged ||
        hasActiveChanged;

      // A participation that has already been invoiced is never moved back into the
      // billing queue by a sync — see `resolveSyncStatus` for why.
      const { status: newStatus, reviewReason } = resolveSyncStatus({
        currentStatus: document_.status,
        hasBill: hasRaisedBill(document_),
        isRoleOk,
        isMissingMandatoryData: isMissing,
        hasChanges,
      });

      const statusChanged = (document_.status as string) !== newStatus;
      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];

      if (
        hasChanges ||
        statusChanged ||
        hasMissingStammdatenChanged ||
        hasMissingAnmeldeangabenChanged ||
        writeBackEntries.length > 0
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
        if (hasEventNameChanged)
          diff['eventName'] = { from: String(document_.eventName), to: event.eventName ?? '' };
        if (hasStreetChanged)
          diff['street'] = { from: String(document_.street), to: participation.street ?? '' };
        if (hasZipChanged)
          diff['zip'] = { from: String(document_.zip), to: participation.zip ?? '' };
        if (hasZipCodeChanged)
          diff['zipCode'] = { from: String(document_.zipCode), to: participation.zipCode ?? '' };
        if (hasTownChanged)
          diff['town'] = { from: String(document_.town), to: participation.town ?? '' };
        if (hasEmailChanged)
          diff['email'] = { from: String(document_.email), to: invoiceEmail ?? '' };
        if (hasAnmeldestatusChanged)
          diff['anmeldestatus'] = {
            from: String(document_.anmeldestatus),
            to: effectiveAnmeldestatus ?? '',
          };
        if (hasBirthdayChanged)
          diff['birthday'] = { from: String(document_.birthday), to: participation.birthday ?? '' };
        if (hasGenderChanged)
          diff['gender'] = { from: String(document_.gender), to: participation.gender ?? '' };
        if (hasActiveChanged)
          diff['active'] = { from: String(document_.active), to: String(participation.active) };
        if (statusChanged) {
          diff['status'] = {
            from: String(document_.status),
            to: newStatus,
          };
        }
        if (hasMissingStammdatenChanged) {
          diff['missingStammdaten'] = {
            from: JSON.stringify(document_.missingStammdaten ?? []),
            to: JSON.stringify(validationResult.missingStammdaten),
          };
        }
        if (hasMissingAnmeldeangabenChanged) {
          diff['missingAnmeldeangaben'] = {
            from: JSON.stringify(document_.missingAnmeldeangaben ?? []),
            to: JSON.stringify(validationResult.missingAnmeldeangaben),
          };
        }

        await participantRepo.update(document_.id, {
          lastSyncDate: now,
          groupId: event.groupId,
          eventName: event.eventName ?? '',
          firstName: participation.firstName,
          lastName: participation.lastName,
          nickname: participation.nickname,
          fullName: participation.fullName,
          roleType: participation.roleType,
          status: newStatus,
          street: participation.street ?? null,
          zip: participation.zip ?? null,
          zipCode: participation.zipCode ?? null,
          town: participation.town ?? null,
          email: invoiceEmail,
          anmeldestatus: effectiveAnmeldestatus,
          birthday: participation.birthday ?? null,
          gender: participation.gender ?? null,
          active: participation.active,
          missingStammdaten: validationResult.missingStammdaten,
          missingAnmeldeangaben: validationResult.missingAnmeldeangaben,
          syncHistory: [
            ...history,
            ...writeBackEntries,
            {
              date: now,
              action:
                newStatus === NEEDS_MANUAL_REVIEW
                  ? 'manual_review_required'
                  : 'participant_updated',
              diff,
              ...(reviewReason === undefined ? {} : { reviewReason }),
            },
          ],
        });
        if (newStatus === NEEDS_MANUAL_REVIEW && statusChanged) summary.needsReviewCount++;
        summary.changedCount++;
      } else {
        await participantRepo.update(document_.id, {
          lastSyncDate: now,
          syncHistory: [...history, { date: now, action: 'sync_confirmed' }],
        });
        summary.unchangedCount++;
      }
    }
  }

  // Detect removed participations (in DB but not in API response)
  const allExistingForEvent = await participantRepo.findActiveForEvent(event.eventId);

  const vanished = allExistingForEvent.filter(
    (document_) => !fetchedParticipationIds.has(document_.participationUuid),
  );

  // An empty participation list used to abort the whole event, because a failed fetch and
  // a genuinely empty event both arrived here as `[]`. They no longer do: the client
  // throws on a transport error and now also on an unparseable body, so reaching this
  // point means Cevi.DB answered and meant it. An event that really has emptied out is
  // therefore reconciled rather than reported as an irreconcilable error on every run.
  //
  // What remains worth guarding is the shape the old check never covered: a response that
  // is readable but *partial*. Losing most of an event at once is not something a camp
  // does between two syncs, so a removal that large is refused and left for a human.
  const isSuspiciousDrop =
    allExistingForEvent.length >= MIN_PARTICIPANTS_FOR_DROP_GUARD &&
    vanished.length / allExistingForEvent.length > MAX_REMOVED_FRACTION_PER_SYNC;

  if (isSuspiciousDrop) {
    throw new Error(
      `Cevi.DB meldet für Anlass ${event.eventId} (${event.eventName}) nur noch ` +
        `${String(participations.length)} von ${String(allExistingForEvent.length)} Anmeldungen. ` +
        `Das sind ${String(vanished.length)} Abmeldungen auf einmal – der Abgleich hat sie nicht ` +
        `übernommen, damit ein unvollständiger Abruf nicht ganze Anlässe leert. Bitte im Cevi.DB prüfen.`,
    );
  }

  for (const document_ of vanished) {
    {
      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      await participantRepo.update(document_.id, {
        status: 'removed',
        removedDate: now,
        lastSyncDate: now,
        syncHistory: [
          ...history,
          {
            date: now,
            action: 'removed_detected',
            reviewReason:
              'Die Anmeldung ist in der Cevi.DB nicht mehr vorhanden und wurde deshalb auf „Entfernt“ gesetzt.',
          },
        ],
      });
      summary.removedCount++;
    }
  }
}

/**
 * Traced version of syncSingleEvent.
 */
const syncSingleEventTraced = traceFunction(
  (event) => `syncParticipants:event:${event.eventId}`,
  syncSingleEvent,
  {
    getAttributes: (event) => ({
      'event.id': event.eventId,
      'event.name': event.eventName ?? '',
      'group.id': event.groupId,
    }),
  },
);

/**
 * Pure Domain Use Case implementation of syncParticipants.
 */
export async function syncParticipantsUseCase(
  participantRepo: ParticipantRepositoryPort,
  hitobitoService: HitobitoServicePort,
  settingsRepo: SettingsPort,
  logger: SyncLogger,
  reporter?: JobProgressReporter,
): Promise<SyncSummary> {
  const now = new Date().toISOString();
  const summary: SyncSummary = {
    newCount: 0,
    removedCount: 0,
    reAddedCount: 0,
    changedCount: 0,
    unchangedCount: 0,
    needsReviewCount: 0,
    syncDate: now,
    errors: [],
  };

  // 1. Load bill settings
  const settings = await settingsRepo.getBillSettings();
  const rawEvents = (settings.events as BillSettingsEvent[] | undefined) ?? [];
  const events: BillSettingsEvent[] = [];
  const excludedEvents: BillSettingsEvent[] = [];

  for (const event of rawEvents) {
    if (isAufbauOrAbbaulager(event.eventName)) {
      excludedEvents.push(event);
    } else {
      events.push(event);
    }
  }

  // Deactivate or reconcile existing participants for excluded events (Aufbau- and Abbaulager)
  for (const event of excludedEvents) {
    if (typeof event.eventId !== 'string' || event.eventId.trim() === '') continue;
    const existingForExcluded = await participantRepo.findActiveForEvent(event.eventId);
    for (const document_ of existingForExcluded) {
      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      const hasBill = hasRaisedBill(document_);
      const newStatus = hasBill ? NEEDS_MANUAL_REVIEW : 'removed';
      const action = hasBill ? 'manual_review_required' : 'removed_detected';
      const reviewReason = hasBill
        ? 'Anlass ist ein Aufbau- oder Abbaulager und für die Abrechnung ausgeschlossen, es wurde jedoch bereits eine Rechnung erstellt.'
        : 'Anlass ist ein Aufbau- oder Abbaulager und für die Abrechnung ausgeschlossen.';

      await participantRepo.update(document_.id, {
        status: newStatus,
        ...(hasBill ? {} : { removedDate: now }),
        lastSyncDate: now,
        syncHistory: [
          ...history,
          {
            date: now,
            action,
            reviewReason,
          },
        ],
      });

      if (hasBill) {
        summary.needsReviewCount++;
      } else {
        summary.removedCount++;
      }
    }
  }
  // A role nobody has priced cannot be billed, so the sync flags it rather than letting
  // bill generation fall back to somebody else's price later.
  const rolePricingPatterns = (settings.rolePricing ?? []).map(
    (pricing) => pricing.roleTypePattern,
  );
  if (events.length === 0) {
    summary.errors.push('No events configured in Bill Settings.');
    summary.relatedDocuments = ['billSettings'];
    return summary;
  }

  // 2. Fetch participations for each event
  const runningSummary = (): Record<string, number> => ({
    newCount: summary.newCount,
    removedCount: summary.removedCount,
    reAddedCount: summary.reAddedCount,
    changedCount: summary.changedCount,
    unchangedCount: summary.unchangedCount,
    needsReviewCount: summary.needsReviewCount,
  });

  for (const [index, event] of events.entries()) {
    // Reported before the event is walked so the operator sees the name of what is
    // currently being fetched, not the one that just finished.
    await reporter?.report({
      processedItems: index,
      totalItems: events.length,
      currentItemName: event.eventName ?? '',
      runningSummary: runningSummary(),
    });

    if (await reporter?.shouldCancel()) {
      summary.cancelled = true;
      logger.info(
        `Sync cancelled by operator after ${String(index)} of ${String(events.length)} events.`,
      );
      break;
    }

    try {
      await syncSingleEventTraced(
        event,
        hitobitoService,
        participantRepo,
        now,
        summary,
        rolePricingPatterns,
        logger,
      );
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        // Every remaining event reads through the same dead session, and a run that
        // cannot read must not write: an empty answers map looks exactly like a
        // registration whose Pflichtangaben were all deleted.
        logger.error(`Aborting participant sync: ${error.message}`);
        summary.errors.push(CEVIDB_SESSION_EXPIRED_MESSAGE);
        summary.relatedDocuments = ['registrationManagement'];
        break;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.errors.push(`Event ${event.eventId} (${event.eventName ?? '–'}): ${errorMessage}`);
    }
  }

  if (summary.cancelled !== true) {
    await reporter?.report({
      processedItems: events.length,
      totalItems: events.length,
      currentItemName: '',
      runningSummary: runningSummary(),
    });
  }

  logger.info(
    `Sync complete: ${String(summary.newCount)} new, ${String(summary.removedCount)} removed, ${String(summary.reAddedCount)} re-added, ${String(summary.changedCount)} changed, ${String(summary.unchangedCount)} unchanged, ${String(summary.needsReviewCount)} need manual review`,
  );

  return summary;
}

/**
 * Backwards compatible syncParticipants wrapper function.
 */
async function syncParticipantsImpl(
  payload: Payload,
  reporter?: JobProgressReporter,
  /** Identifies the run. Queued tasks pass their job id; see `RunLockPort`. */
  runOwner?: string,
): Promise<SyncSummary> {
  // Both replicas poll the job queue, so both used to execute the same queued sync at
  // once. They walk the same events and reach `create` for a participation neither has
  // seen yet within milliseconds of each other, so the loser lost to the
  // `participationUuid` unique index and reported the whole event as failed — a run that
  // had in fact synced correctly on the other worker. A second sync then "fixed" it,
  // because by then the row existed and the update path took over.
  //
  // Imported lazily: the adapter reaches Redis, which reads the validated environment at
  // module load, and that would make this module unimportable from a unit test of the
  // pure use case above.
  const { RedisRunLockAdapter } =
    await import('@/features/billing/adapters/redis-run-lock.adapter');
  const { classifyLockConflict } = await import('@/features/billing/ports/run-lock.port');

  const owner = runOwner ?? `request:${randomUUID()}`;
  const lockResult = await new RedisRunLockAdapter().acquire(
    BillingTaskSlug.SyncParticipants,
    RUN_LOCK_TTL_SECONDS,
    owner,
  );

  if (!lockResult.acquired) {
    const empty = {
      newCount: 0,
      removedCount: 0,
      reAddedCount: 0,
      changedCount: 0,
      unchangedCount: 0,
      needsReviewCount: 0,
      syncDate: new Date().toISOString(),
    };

    if (classifyLockConflict(lockResult.heldBy, owner) === 'duplicate-worker') {
      // The same queued job, picked up by both replicas. The worker holding the lock is
      // doing exactly the work that was asked for; this one has nothing to report.
      payload.logger.info(
        `Participant sync for job ${owner} is already running on another worker; skipping this duplicate execution.`,
      );
      return { ...empty, duplicate: true, errors: [] };
    }

    payload.logger.warn(
      `Refused to start participant sync for ${owner}: run ${lockResult.heldBy ?? 'unknown'} holds the lock.`,
    );
    return {
      ...empty,
      errors: ['Es läuft bereits ein Abgleich. Bitte warte, bis dieser abgeschlossen ist.'],
    };
  }

  try {
    return await syncParticipantsLocked(payload, reporter);
  } finally {
    // Inside the lock on purpose: only the execution that acquired it owns the progress
    // record, and the keys are scoped by task slug rather than by job.
    await reporter?.finish();
    await lockResult.lock.release();
  }
}

async function syncParticipantsLocked(
  payload: Payload,
  reporter: JobProgressReporter | undefined,
): Promise<SyncSummary> {
  const settingsRepo = new PayloadSettingsAdapter(payload);
  const participantRepo = new PayloadParticipantRepositoryAdapter(payload);

  const regManagement = await settingsRepo.getRegistrationManagement();
  const cookieValue = regManagement.browserCookie;
  const browserCookie =
    typeof cookieValue === 'string' && cookieValue.length > 0 ? cookieValue : '';

  const logger: SyncLogger = {
    info: (m: string): void => payload.logger.info(m),
    warn: (m: string): void => payload.logger.warn(m),
    error: (m: string): void => payload.logger.error(m),
    debug: (m: string): void => payload.logger.debug(m),
  };

  if (browserCookie.trim() === '') {
    const errorMessage =
      'Hitobito browser cookie is missing in Registration Management settings. Aborting participant sync to prevent data loss.';
    logger.error(errorMessage);
    return {
      newCount: 0,
      removedCount: 0,
      reAddedCount: 0,
      changedCount: 0,
      unchangedCount: 0,
      needsReviewCount: 0,
      syncDate: new Date().toISOString(),
      errors: [errorMessage],
      relatedDocuments: ['registrationManagement'],
    };
  }

  const hitobitoService = new HitobitoServiceAdapter(
    {
      baseUrl: HITOBITO_CONFIG.baseUrl,
      apiToken: HITOBITO_CONFIG.apiToken,
      browserCookie,
    },
    logger,
  );

  return syncParticipantsUseCase(participantRepo, hitobitoService, settingsRepo, logger, reporter);
}

/**
 * Traced entry point.
 */
export const syncParticipants = traceFunction('syncParticipants', syncParticipantsImpl, {
  onSuccess: (span, summary) => {
    span.setAttributes({
      'sync.new_count': summary.newCount,
      'sync.removed_count': summary.removedCount,
      'sync.re_added_count': summary.reAddedCount,
      'sync.changed_count': summary.changedCount,
      'sync.unchanged_count': summary.unchangedCount,
      'sync.errors_count': summary.errors.length,
    });
  },
});
