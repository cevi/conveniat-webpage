import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import {
  ANMELDESTATUS_REVERT_FAILED_ACTION,
  ANMELDESTATUS_REVERTED_ACTION,
  ANMELDESTATUS_WRITTEN_ACTION,
  revertAnmeldestatus,
  writeBackAnmeldestatus,
  type WriteBackParticipation,
} from '@/features/billing/services/anmeldestatus-writeback';
import { NEEDS_MANUAL_REVIEW } from '@/features/billing/services/billing-status';
import { isRoutine, type SyncHistoryEntry } from '@/features/billing/services/sync-history-summary';
import type { BillParticipant, OutgoingEmail } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/** A bill whose mail is in the outgoing queue and has not left yet. */
export const BILL_MAIL_PENDING = 'bill_mail_pending';

/**
 * Statuses that say the participant has the bill, or is about to get it. A paid or
 * cancelled registration has nothing left to deliver, and one without a bill was never sent.
 */
const AWAITING_BILL_STATUSES: ReadonlySet<string> = new Set([
  'bill_created',
  BILL_MAIL_PENDING,
  'bill_sent',
  'reminder_sent',
  NEEDS_MANUAL_REVIEW,
]);

const relationId = (relation: unknown): string | undefined => {
  if (typeof relation === 'string') return relation;
  const id = (relation as { id?: unknown } | null | undefined)?.id;
  return typeof id === 'string' ? id : undefined;
};

/** The participation a mail is the bill of, when it is one. */
export const billParticipantIdOf = (
  email: Pick<OutgoingEmail, 'billParticipant'>,
): string | undefined => relationId(email.billParticipant);

/** The prefix of the history entry that parks a bill because its mail did not arrive. */
const MAIL_FAILED_ACTION_PREFIX = 'bill_mail_failed_to_';

/** A `syncHistory` entry, as far as this module reads it. */
interface HistoryEntry extends SyncHistoryEntry {
  /** The mail a `bill_mail_failed_to_*` entry is about. */
  outgoingEmail?: string;
  /** The status the bill had before its mail failed. */
  statusBefore?: string;
  previous?: string;
}

const historyOf = (participant: { syncHistory?: unknown }): HistoryEntry[] =>
  Array.isArray(participant.syncHistory) ? (participant.syncHistory as HistoryEntry[]) : [];

/** Opens a Cevi.DB session with the stored browser cookie, or `undefined` without one. */
type ConnectCeviDB = (payload: Payload) => Promise<HitobitoServicePort | undefined>;

const connectWithStoredCookie: ConnectCeviDB = async (payload) => {
  // Imported here, because the send service imports this module.
  const { createHitobitoService } = await import('@/features/billing/services/email-service');
  return createHitobitoService(payload);
};

const participationOf = (participant: BillParticipant): WriteBackParticipation => ({
  groupId: participant.groupId ?? '',
  eventId: participant.eventId,
  participationUuid: participant.participationUuid,
  fullName: participant.fullName,
  anmeldestatus: participant.anmeldestatus,
});

/**
 * Whether the bill was parked for nothing but this mail failing, so this mail arriving after
 * all settles it: an admin overriding a bounce that was none, or a resend going through.
 *
 * Anything recorded since that a person has to see, such as data that changed in the
 * Cevi.DB, keeps the row parked.
 */
const isParkedOnlyFor = (history: readonly HistoryEntry[], emailId: string): boolean => {
  const index = history.findLastIndex((entry) =>
    entry.action.startsWith(MAIL_FAILED_ACTION_PREFIX),
  );
  const failure = history[index];
  if (failure?.outgoingEmail !== emailId) return false;
  if (failure.statusBefore === undefined || failure.statusBefore === NEEDS_MANUAL_REVIEW) {
    return false;
  }
  return history
    .slice(index + 1)
    .every(
      (entry) =>
        entry.action === ANMELDESTATUS_REVERTED_ACTION ||
        entry.action === ANMELDESTATUS_REVERT_FAILED_ACTION ||
        isRoutine(entry),
    );
};

/**
 * Moves a bill to "sent" once its mail has really left.
 *
 * From `bill_mail_pending`, the ordinary case. From `needs_manual_review` only when this very
 * mail parked the row and nothing else has come up since; the Cevi.DB then reads
 * "Rechnung gestellt" again. Every other row keeps the status an operator or a sync gave it.
 *
 * The row is re-read here because the mail may leave days after it was queued, and the
 * history has grown since.
 */
export const markBillMailSent = async (
  payload: Payload,
  participantId: string,
  email: Pick<OutgoingEmail, 'id' | 'to'>,
  connect: ConnectCeviDB = connectWithStoredCookie,
): Promise<void> => {
  const participant = await payload.findByID({
    collection: 'bill-participants',
    id: participantId,
    depth: 0,
    disableErrors: true,
    context: { internal: true },
  });
  if (participant === null) return;
  const history = historyOf(participant);
  const sentAt = new Date().toISOString();
  const sentEntry = { date: sentAt, action: `bill_sent_to_${email.to}` };

  if (participant.status === BILL_MAIL_PENDING) {
    await payload.update({
      collection: 'bill-participants',
      id: participantId,
      context: { internal: true },
      data: { status: 'bill_sent', billSentDate: sentAt, syncHistory: [...history, sentEntry] },
    });
    return;
  }

  if (participant.status !== NEEDS_MANUAL_REVIEW || !isParkedOnlyFor(history, email.id)) return;

  const statusBefore = history.findLast((entry) =>
    entry.action.startsWith(MAIL_FAILED_ACTION_PREFIX),
  )?.statusBefore;
  const restored = [...history, sentEntry];
  await payload.update({
    collection: 'bill-participants',
    id: participantId,
    context: { internal: true },
    data: {
      status: statusBefore === 'reminder_sent' ? 'reminder_sent' : 'bill_sent',
      ...(typeof participant.billSentDate === 'string' && participant.billSentDate !== ''
        ? {}
        : { billSentDate: sentAt }),
      syncHistory: restored,
    },
  });
  payload.logger.info(
    `Bill mail ${email.id} to participant ${participantId} arrived after all; review cleared.`,
  );

  const writeBack = await writeBackAnmeldestatus(
    await connect(payload),
    participationOf(participant),
    sentAt,
    payload.logger,
  );
  if (
    writeBack.historyEntries.length === 0 &&
    writeBack.anmeldestatus === participant.anmeldestatus
  )
    return;
  await payload.update({
    collection: 'bill-participants',
    id: participantId,
    context: { internal: true },
    data: {
      ...(writeBack.anmeldestatus === undefined ? {} : { anmeldestatus: writeBack.anmeldestatus }),
      syncHistory: [...restored, ...writeBack.historyEntries],
    },
  });
};

/**
 * Parks a bill for manual review once its mail could not be sent or came back, and puts the
 * Cevi.DB Anmeldestatus back to what it was before "Rechnung gestellt".
 *
 * The participant does not have the bill, while the row would still say it was sent, the
 * Abteilung would read "Rechnung gestellt" in the Cevi.DB, and the finance team would wait
 * for a payment that cannot come. Someone has to look, so the row moves to
 * `needs_manual_review` with the reason in its history. It leaves through "Rechnung
 * versenden" on the row, which sends the same bill again and writes the status anew, or by
 * this mail arriving after all; see {@link markBillMailSent}.
 *
 * Only the current bill counts. A mail of a bill that has since been replaced says nothing
 * about the new one, and once any mail of the current bill has arrived, the participant has
 * it, whatever a later or earlier attempt reports.
 *
 * The row is re-read, because a bounce arrives hours or days after the mail left.
 */
export const markBillMailFailed = async (
  payload: Payload,
  participantId: string,
  email: Pick<OutgoingEmail, 'id' | 'to' | 'createdAt'>,
  connect: ConnectCeviDB = connectWithStoredCookie,
): Promise<void> => {
  const participant = await payload.findByID({
    collection: 'bill-participants',
    id: participantId,
    depth: 0,
    disableErrors: true,
    context: { internal: true },
  });
  if (participant === null || !AWAITING_BILL_STATUSES.has(participant.status)) return;

  const billCreated = participant.billCreatedDate ?? '';
  if (billCreated !== '' && Date.parse(email.createdAt) < Date.parse(billCreated)) return;

  const delivered = await payload.find({
    collection: 'outgoing-emails',
    where: {
      and: [
        { billParticipant: { equals: participantId } },
        { deliveryStatus: { equals: 'success' } },
        { id: { not_equals: email.id } },
        ...(billCreated === '' ? [] : [{ createdAt: { greater_than_equal: billCreated } }]),
      ],
    },
    depth: 0,
    limit: 1,
    context: { internal: true },
  });
  if (delivered.docs.length > 0) return;

  const now = new Date().toISOString();
  const history = historyOf(participant);
  const failure: HistoryEntry = {
    date: now,
    action: `${MAIL_FAILED_ACTION_PREFIX}${email.to}`,
    outgoingEmail: email.id,
    statusBefore: participant.status,
    reviewReason:
      `Die Rechnung wurde nicht an ${email.to} zugestellt. Warum, steht im Zustellverlauf der ` +
      `ausgehenden E-Mail ${email.id}. Ist die Adresse falsch, sie in der Cevi.DB korrigieren ` +
      `und abgleichen, danach die Rechnung erneut versenden.`,
  };
  // Parked before the Cevi.DB is touched: a park that fails must not leave a reverted
  // Cevi.DB behind a row that still says sent.
  const parked = [...history, failure];
  await payload.update({
    collection: 'bill-participants',
    id: participantId,
    context: { internal: true },
    data: { status: NEEDS_MANUAL_REVIEW, syncHistory: parked },
  });
  payload.logger.warn(
    `Bill mail ${email.id} to participant ${participantId} failed; parked for manual review.`,
  );

  const revert = await revertAnmeldestatus(
    // Only connect when there is something to revert: the session costs a request.
    history.some((entry) => entry.action === ANMELDESTATUS_WRITTEN_ACTION)
      ? await connect(payload)
      : undefined,
    participationOf(participant),
    history,
    now,
    payload.logger,
  );
  if (revert.historyEntries.length === 0 && revert.anmeldestatus === participant.anmeldestatus)
    return;
  await payload.update({
    collection: 'bill-participants',
    id: participantId,
    context: { internal: true },
    data: {
      ...(revert.anmeldestatus === undefined ? {} : { anmeldestatus: revert.anmeldestatus }),
      syncHistory: [...parked, ...revert.historyEntries],
    },
  });
};

/**
 * Why a queued bill mail should not go out any more, if it should not.
 *
 * A bill can wait in the queue for days. In that time the registration may have been
 * cancelled, parked for review or given a new bill, and the queued mail still carries the
 * old PDF. Anything but `bill_mail_pending` means the mail has been overtaken.
 */
export const staleBillMailReason = async (
  payload: Payload,
  email: Pick<OutgoingEmail, 'billParticipant'>,
): Promise<string | undefined> => {
  const participantId = billParticipantIdOf(email);
  if (participantId === undefined) return undefined;

  const participant = await payload.findByID({
    collection: 'bill-participants',
    id: participantId,
    depth: 0,
    disableErrors: true,
    context: { internal: true },
  });
  if (participant === null) return 'the registration no longer exists';
  return participant.status === BILL_MAIL_PENDING
    ? undefined
    : `the registration is now "${String(participant.status)}"`;
};
