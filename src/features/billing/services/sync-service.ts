/* eslint-disable unicorn/no-null */
import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import { PayloadParticipantRepositoryAdapter } from '@/features/billing/adapters/payload-participant-repository.adapter';
import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import type { ParticipantRepositoryPort } from '@/features/billing/ports/participant-repository.port';
import type { SettingsPort } from '@/features/billing/ports/settings.port';
import { isRoleAllowed, validateParticipant } from '@/features/billing/services/validation-service';
import type { SyncSummary } from '@/features/billing/types';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import { traceFunction, withSpan } from '@/utils/tracing-helpers';
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

function findInvoiceEmail(answers: Record<string, string>): string | null {
  const findAnswer = (questionKeywords: string[]): string | undefined => {
    const entry = Object.entries(answers).find(([qText]) =>
      questionKeywords.every((kw) => qText.toLowerCase().includes(kw.toLowerCase())),
    );
    return entry?.[1];
  };
  return findAnswer(['mailadresse', 'rechnung']) ?? findAnswer(['e-mail', 'rechnung']) ?? null;
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
          event.eventId,
          participation.participationId,
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
        groupName: event.eventName,
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
        birthday: participation.birthday ?? null,
        gender: participation.gender ?? null,
        active: participation.active,
      };

      const isRoleOk = isRoleAllowed(participation.roleType);
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
      const hasGroupNameChanged = normalize(document_.groupName) !== normalize(event.eventName);

      const hasStreetChanged = normalize(document_.street) !== normalize(participation.street);
      const hasZipChanged = normalize(document_.zip) !== normalize(participation.zip);
      const hasZipCodeChanged = normalize(document_.zipCode) !== normalize(participation.zipCode);
      const hasTownChanged = normalize(document_.town) !== normalize(participation.town);
      const hasEmailChanged = normalize(document_.email) !== normalize(invoiceEmail);
      const hasBirthdayChanged =
        normalize(document_.birthday) !== normalize(participation.birthday);
      const hasGenderChanged = normalize(document_.gender) !== normalize(participation.gender);
      const hasActiveChanged = Boolean(document_.active) !== Boolean(participation.active);

      const isRoleOk = isRoleAllowed(participation.roleType);
      const isMissing = !validationResult.isValid;
      const wasInvalidOrMissing =
        (document_.status as string) === 'pflichtangaben_missing' ||
        (document_.status as string) === 'invalid_anmeldeangaben';

      let newStatus = document_.status as string;
      if (!isRoleOk) {
        newStatus = 'invalid_anmeldeangaben';
      } else if (isMissing) {
        newStatus = 'pflichtangaben_missing';
      } else if (wasInvalidOrMissing) {
        newStatus = 'new';
      } else if (
        hasRoleChanged ||
        hasNameChanged ||
        hasFirstNameChanged ||
        hasLastNameChanged ||
        hasNicknameChanged ||
        hasGroupIdChanged ||
        hasGroupNameChanged ||
        hasStreetChanged ||
        hasZipChanged ||
        hasZipCodeChanged ||
        hasTownChanged ||
        hasEmailChanged ||
        hasBirthdayChanged ||
        hasGenderChanged ||
        hasActiveChanged
      ) {
        newStatus = 'updated';
      }

      const statusChanged = (document_.status as string) !== newStatus;
      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];

      if (
        hasRoleChanged ||
        hasNameChanged ||
        hasFirstNameChanged ||
        hasLastNameChanged ||
        hasNicknameChanged ||
        hasGroupIdChanged ||
        hasGroupNameChanged ||
        hasStreetChanged ||
        hasZipChanged ||
        hasZipCodeChanged ||
        hasTownChanged ||
        hasEmailChanged ||
        hasBirthdayChanged ||
        hasGenderChanged ||
        hasActiveChanged ||
        statusChanged
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
        if (hasGroupNameChanged)
          diff['groupName'] = { from: String(document_.groupName), to: event.eventName };
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

        await participantRepo.update(document_.id, {
          lastSyncDate: now,
          groupId: event.groupId,
          groupName: event.eventName,
          firstName: participation.firstName,
          lastName: participation.lastName,
          nickname: participation.nickname,
          fullName: participation.fullName,
          roleType: participation.roleType,
          status: newStatus as never,
          street: participation.street ?? null,
          zip: participation.zip ?? null,
          zipCode: participation.zipCode ?? null,
          town: participation.town ?? null,
          email: invoiceEmail,
          birthday: participation.birthday ?? null,
          gender: participation.gender ?? null,
          active: participation.active,
          syncHistory: [...history, { date: now, action: 'participant_updated', diff }],
        });
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

  for (const document_ of allExistingForEvent) {
    const participationUuid = document_.participationUuid;
    if (!fetchedParticipationIds.has(participationUuid)) {
      const history = (document_.syncHistory as SyncHistoryEntry[] | undefined) ?? [];
      await participantRepo.update(document_.id, {
        status: 'removed',
        removedDate: now,
        lastSyncDate: now,
        syncHistory: [...history, { date: now, action: 'removed_detected' }],
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
      'event.name': event.eventName,
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
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  },
): Promise<SyncSummary> {
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
  const settings = await settingsRepo.getBillSettings();
  const events = (settings.events as BillSettingsEvent[] | undefined) ?? [];
  if (events.length === 0) {
    summary.errors.push('No events configured in Bill Settings.');
    return summary;
  }

  // 2. Fetch participations for each event
  for (const event of events) {
    try {
      await syncSingleEventTraced(event, hitobitoService, participantRepo, now, summary);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.errors.push(`Event ${event.eventId} (${event.eventName}): ${errorMessage}`);
    }
  }

  logger.info(
    `Sync complete: ${String(summary.newCount)} new, ${String(summary.removedCount)} removed, ${String(summary.reAddedCount)} re-added, ${String(summary.changedCount)} changed, ${String(summary.unchangedCount)} unchanged`,
  );

  return summary;
}

/**
 * Backwards compatible syncParticipants wrapper function.
 */
async function syncParticipantsImpl(payload: Payload): Promise<SyncSummary> {
  const settingsRepo = new PayloadSettingsAdapter(payload);
  const participantRepo = new PayloadParticipantRepositoryAdapter(payload);

  const regManagement = await settingsRepo.getRegistrationManagement();
  const cookieValue = regManagement.browserCookie;
  const browserCookie =
    typeof cookieValue === 'string' && cookieValue.length > 0 ? cookieValue : '';

  const logger = {
    info: (m: string): void => payload.logger.info(m),
    warn: (m: string): void => payload.logger.warn(m),
    error: (m: string): void => payload.logger.error(m),
  };

  const hitobitoService = new HitobitoServiceAdapter(
    {
      baseUrl: HITOBITO_CONFIG.baseUrl,
      apiToken: HITOBITO_CONFIG.apiToken,
      browserCookie,
    },
    logger,
  );

  return syncParticipantsUseCase(participantRepo, hitobitoService, settingsRepo, logger);
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
