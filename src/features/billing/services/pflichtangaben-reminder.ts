import type { BillingAdminDocumentKey } from '@/features/billing/admin-documents';
import type { WeeklySlotConfig } from '@/features/billing/services/send-weekly-report';
import { isWeeklySlotDue, parseRecipients } from '@/features/billing/services/send-weekly-report';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import type { BillParticipant } from '@/features/payload-cms/payload-types';
import { HITOBITO_CONFIG } from '@/features/registration_process/hitobito-api';
import type { Payload } from 'payload';

/** The reminder settings, as stored on the `bill-settings` global. */
export interface PflichtangabenReminderConfig extends WeeklySlotConfig {
  minDaysMissing?: number | null;
  subject?: string | null;
  body?: string | null;
}

/** One event of the `bill-settings` event list, reduced to what a reminder needs. */
export interface ReminderEventSettings {
  eventId?: string | null;
  eventName?: string | null;
  addressManagerEmails?: string | null;
  reminderRecipientsOverride?: string | null;
}

/** The mail that goes to one Hof: its Adressverwalter and the registrations to fix. */
export interface EventReminderGroup {
  eventId: string;
  eventName: string;
  recipients: string[];
  participants: BillParticipant[];
}

export interface PflichtangabenReminderSummary {
  sent: boolean;
  /** Why nothing was sent, when nothing was. */
  reason?: string | undefined;
  mailCount: number;
  participantCount: number;
  errors: string[];
  /** Admin documents an operator has to fix for the next run to reach everyone. */
  relatedDocuments?: BillingAdminDocumentKey[];
}

const DEFAULT_SUBJECT = 'conveniat27 – fehlende Pflichtangaben in {{eventName}}';

const DEFAULT_BODY =
  'Hallo\n\nBei {{count}} Anmeldung(en) für {{eventName}} fehlen Pflichtangaben. Diese Anmeldungen können erst verrechnet werden, wenn die Angaben in der Cevi.DB vollständig sind. Bitte ergänzt die folgenden Angaben:';

const CLOSING =
  'Sobald die Angaben in der Cevi.DB ergänzt sind, werden die Anmeldungen beim nächsten Abgleich automatisch verrechnet.\n\nFreundliche Grüsse\nconveniat27 – Ressort Finanzen';

/** The reason a manual send reports when the row does not have missing mandatory fields. */
export const NOT_MISSING_REASON =
  'Bei dieser Anmeldung fehlen keine Pflichtangaben, es wurde keine Erinnerung versendet.';

/**
 * The missing-field lists are `json` columns, so the renderer sees whatever a sync last
 * wrote — including the shapes a draft or an older sync produced.
 */
const readFieldNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
};

/**
 * The registrations old enough to chase.
 *
 * A registration that arrived this morning is incomplete because nobody has had time yet,
 * not because it was forgotten, so the age is counted from the first sync. A row without a
 * usable `firstSyncDate` is left out rather than treated as infinitely old.
 */
export function selectOverdueParticipants(
  participants: BillParticipant[],
  now: Date,
  minDays: number,
): BillParticipant[] {
  return participants.filter((participant) => {
    if (participant.status !== 'pflichtangaben_missing') return false;
    const firstSync = participant.firstSyncDate;
    if (typeof firstSync !== 'string' || firstSync === '') return false;
    const since = new Date(firstSync);
    if (Number.isNaN(since.getTime())) return false;
    return (now.getTime() - since.getTime()) / 86_400_000 >= minDays;
  });
}

/**
 * Splits the registrations into one mail per Hof.
 *
 * An event whose settings row has no addresses is still returned, with an empty recipient
 * list: the caller has to report that nobody is being told, because silence here looks
 * exactly like "there is nothing to fix".
 */
export function groupRemindersByEvent(
  participants: BillParticipant[],
  events: ReminderEventSettings[],
): EventReminderGroup[] {
  const groups = new Map<string, EventReminderGroup>();

  for (const participant of participants) {
    const eventId = participant.eventId;
    const existing = groups.get(eventId);
    if (existing) {
      existing.participants.push(participant);
      continue;
    }

    const settings = events.find((event) => event.eventId === eventId);
    groups.set(eventId, {
      eventId,
      eventName: settings?.eventName ?? participant.eventName ?? eventId,
      recipients: parseRecipients(
        settings?.reminderRecipientsOverride,
        settings?.addressManagerEmails,
      ),
      participants: [participant],
    });
  }

  return [...groups.values()];
}

/** Fills the placeholders the subject and the intro may use. */
export function applyReminderPlaceholders(
  template: string,
  values: { eventName: string; count: number },
): string {
  return template
    .replaceAll('{{eventName}}', values.eventName)
    .replaceAll('{{count}}', String(values.count));
}

const participationUrl = (participant: BillParticipant, hitobitoBaseUrl: string): string =>
  `${hitobitoBaseUrl}/groups/${participant.groupId}/events/${participant.eventId}/participations/${participant.participationUuid}`;

/**
 * The mail body: the operator's intro, one block per registration, and a closing line.
 *
 * The Cevi.DB link is per participation rather than per person, because that is the page
 * an Adressverwalter has to open to fill the Anmeldeangaben in.
 */
export function renderReminderText(input: {
  eventName: string;
  participants: BillParticipant[];
  intro: string;
  hitobitoBaseUrl: string;
}): string {
  const blocks = input.participants.map((participant) => {
    const nickname =
      typeof participant.nickname === 'string' && participant.nickname.trim() !== ''
        ? ` (${participant.nickname})`
        : '';
    const lines = [
      `${participant.fullName}${nickname}`,
      participationUrl(participant, input.hitobitoBaseUrl),
    ];

    const stammdaten = readFieldNames(participant.missingStammdaten);
    if (stammdaten.length > 0) lines.push(`Fehlende Stammdaten: ${stammdaten.join(', ')}`);

    const anmeldeangaben = readFieldNames(participant.missingAnmeldeangaben);
    if (anmeldeangaben.length > 0)
      lines.push(`Fehlende Anmeldeangaben: ${anmeldeangaben.join(', ')}`);

    return lines.join('\n');
  });

  return [input.intro, ...blocks, CLOSING].join('\n\n');
}

/** Whether this hour is the reminder's configured slot. */
export function isReminderDue(
  config: PflichtangabenReminderConfig | null | undefined,
  now: Date,
): { due: boolean; reason?: string | undefined } {
  return isWeeklySlotDue(config, now);
}

/** Appends one entry to the participant's audit trail without touching its status. */
const appendHistory = async (
  payload: Payload,
  participant: BillParticipant,
  entry: Record<string, unknown>,
): Promise<void> => {
  const history = Array.isArray(participant.syncHistory) ? participant.syncHistory : [];
  await payload.update({
    collection: 'bill-participants',
    id: participant.id,
    context: { internal: true },
    data: { syncHistory: [...history, entry] },
  });
};

/**
 * Emails every Hof the registrations of theirs that cannot be billed yet.
 *
 * `force` skips the schedule check, and `participantId` narrows the run to a single
 * registration so an operator can chase one person without waiting for the weekly slot.
 * That manual send deliberately skips the age check — an operator asking for it has
 * already decided the registration is overdue — and does not move `lastSentAt`, which
 * belongs to the scheduled run.
 */
export async function sendPflichtangabenReminders(
  payload: Payload,
  options: { force?: boolean; participantId?: string } = {},
): Promise<PflichtangabenReminderSummary> {
  const settings = await payload.findGlobal({ slug: 'bill-settings', context: { internal: true } });
  const config = (settings as { pflichtangabenReminder?: PflichtangabenReminderConfig })
    .pflichtangabenReminder;
  const now = new Date();

  if (options.force !== true) {
    const due = isReminderDue(config, now);
    if (!due.due)
      return { sent: false, reason: due.reason, mailCount: 0, participantCount: 0, errors: [] };
  }

  const found = await payload.find({
    collection: 'bill-participants',
    where:
      options.participantId === undefined
        ? { status: { equals: 'pflichtangaben_missing' } }
        : { id: { equals: options.participantId } },
    limit: 10_000,
    context: { internal: true },
  });

  const minDays = typeof config?.minDaysMissing === 'number' ? config.minDaysMissing : 7;
  const overdue =
    options.participantId === undefined
      ? selectOverdueParticipants(found.docs, now, minDays)
      : found.docs.filter((participant) => participant.status === 'pflichtangaben_missing');

  if (options.participantId !== undefined && overdue.length === 0)
    return {
      sent: false,
      reason: NOT_MISSING_REASON,
      mailCount: 0,
      participantCount: 0,
      errors: [],
    };

  const groups = groupRemindersByEvent(overdue, settings.events ?? []);
  const errors: string[] = [];
  let mailCount = 0;
  let participantCount = 0;

  for (const group of groups) {
    if (group.recipients.length === 0) {
      errors.push(
        `Für ${group.eventName} sind keine Empfänger hinterlegt; ${String(group.participants.length)} Anmeldung(en) wurden nicht gemeldet.`,
      );
      continue;
    }

    const placeholders = { eventName: group.eventName, count: group.participants.length };
    const subject = applyReminderPlaceholders(config?.subject ?? DEFAULT_SUBJECT, placeholders);
    const text = renderReminderText({
      eventName: group.eventName,
      participants: group.participants,
      intro: applyReminderPlaceholders(config?.body ?? DEFAULT_BODY, placeholders),
      hitobitoBaseUrl: HITOBITO_CONFIG.baseUrl,
    });

    await sendTrackedEmail(
      payload,
      { to: group.recipients.join(', '), subject, text },
      undefined,
      group.participants.map((participant) => participant.id),
    );

    const entry = {
      date: now.toISOString(),
      action: 'pflichtangaben_reminder_sent',
      recipients: group.recipients,
    };
    for (const participant of group.participants) await appendHistory(payload, participant, entry);

    mailCount += 1;
    participantCount += group.participants.length;
    payload.logger.debug(
      `Pflichtangaben reminder for ${group.eventName} sent to ${group.recipients.join(', ')} covering ${String(group.participants.length)} registration(s).`,
    );
  }

  if (options.participantId === undefined) {
    await payload.updateGlobal({
      slug: 'bill-settings',
      context: { internal: true },
      data: {
        pflichtangabenReminder: { ...config, lastSentAt: now.toISOString() },
      } as never,
    });
  }

  payload.logger.info(
    `Pflichtangaben reminders: ${String(mailCount)} mail(s) for ${String(participantCount)} registration(s), ${String(errors.length)} Hof/Höfe without recipients.`,
  );

  return {
    sent: mailCount > 0,
    mailCount,
    participantCount,
    errors,
    ...(errors.length > 0 ? { relatedDocuments: ['billSettings' as const] } : {}),
  };
}
