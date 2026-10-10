import type { OutgoingEmail } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

/** A bill whose mail is in the outgoing queue and has not left yet. */
export const BILL_MAIL_PENDING = 'bill_mail_pending';

const relationId = (relation: unknown): string | undefined => {
  if (typeof relation === 'string') return relation;
  const id = (relation as { id?: unknown } | null | undefined)?.id;
  return typeof id === 'string' ? id : undefined;
};

/** The participation a mail is the bill of, when it is one. */
export const billParticipantIdOf = (
  email: Pick<OutgoingEmail, 'billParticipant'>,
): string | undefined => relationId(email.billParticipant);

/**
 * Moves a bill from "mail queued" to "sent", once its mail has really left.
 *
 * Only ever from `bill_mail_pending`: a row that an operator or a sync has moved on in the
 * meantime keeps the status it was given, and a bill sent directly was never queued.
 *
 * The row is re-read here because the mail may leave days after it was queued, and the
 * history has grown since.
 */
export const markBillMailSent = async (
  payload: Payload,
  participantId: string,
  recipient: string,
): Promise<void> => {
  const participant = await payload.findByID({
    collection: 'bill-participants',
    id: participantId,
    depth: 0,
    disableErrors: true,
    context: { internal: true },
  });
  if (participant?.status !== BILL_MAIL_PENDING) return;

  const sentAt = new Date().toISOString();
  const history = Array.isArray(participant.syncHistory) ? participant.syncHistory : [];
  await payload.update({
    collection: 'bill-participants',
    id: participantId,
    context: { internal: true },
    data: {
      status: 'bill_sent',
      billSentDate: sentAt,
      syncHistory: [...history, { date: sentAt, action: `bill_sent_to_${recipient}` }],
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
