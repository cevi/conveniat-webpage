import {
  sendTrackedEmail,
  type TrackedEmailResult,
} from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import type { OutgoingEmail } from '@/features/payload-cms/payload-types';
import { reserveBackgroundEmail } from '@/lib/background-email-budget';
import { redis } from '@/lib/db/redis';
import { MAIL_ATTACHMENT_BUCKET_NAME, s3Client } from '@/lib/s3';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import type { Payload } from 'payload';

/**
 * A mail nobody is waiting at a screen for: a bill, a reminder, a report.
 *
 * Narrower than what the transport accepts on purpose. Only what is listed here is stored
 * with the queued mail, so anything else a caller passed would be dropped without a trace
 * by the time the mail is sent.
 */
export interface BackgroundEmail {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

/** Where one attachment of a queued mail waits. */
interface StoredAttachment {
  filename: string;
  key: string;
  contentType?: string;
}

export interface OutboxDrainSummary {
  sent: number;
  failed: number;
  discarded: number;
  /** Set when the hourly budget ran out with mails still waiting. */
  budgetExhausted: boolean;
  /** Set when the other replica was already draining. */
  duplicate?: boolean;
}

export interface OutboxDrainHooks {
  /**
   * Asked right before a mail goes out, which can be days after it was queued. Answers
   * with the reason when the mail is no longer wanted; the mail is then discarded.
   */
  staleReason?: (email: OutgoingEmail) => Promise<string | undefined>;
}

const DRAIN_LOCK_KEY = 'email:outbox-drain-lock';
/** A full hour's budget at a few seconds a mail still fits; a drain that died frees the queue after this. */
const DRAIN_LOCK_TTL_MS = 10 * 60 * 1000;
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

/** The column is `json`, so it holds whatever was written, including nothing. */
const readStoredAttachments = (value: unknown): StoredAttachment[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is StoredAttachment =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as StoredAttachment).filename === 'string' &&
      typeof (entry as StoredAttachment).key === 'string',
  );
};

const deleteStoredAttachments = async (
  payload: Payload,
  attachments: StoredAttachment[],
): Promise<void> => {
  for (const attachment of attachments) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: MAIL_ATTACHMENT_BUCKET_NAME, Key: attachment.key }),
      );
    } catch (error) {
      // The mail is dealt with either way; a copy left behind is a cleanup problem.
      payload.logger.warn({
        err: error,
        msg: `Could not delete queued mail attachment ${attachment.key}.`,
      });
    }
  }
};

/**
 * Deletes the stored attachments of a mail that has been sent or given up on.
 *
 * They are copies made for the wait in the queue, so nothing is lost with them.
 */
export const releaseQueuedAttachments = async (
  payload: Payload,
  email: Pick<OutgoingEmail, 'id' | 'queuedAttachments'>,
): Promise<void> => {
  const stored = readStoredAttachments(email.queuedAttachments);
  if (stored.length === 0) return;
  await deleteStoredAttachments(payload, stored);
  await payload.update({
    collection: 'outgoing-emails',
    id: email.id,
    data: { queuedAttachments: [] },
  });
};

/**
 * Puts a mail into the outgoing queue instead of sending it.
 *
 * The mail becomes an `outgoing-emails` row in `queued`, and `drainEmailOutbox` sends it
 * as soon as the hourly budget for background mail has room. Attachments are copied to
 * the attachment bucket, because the mail may leave days later and has to carry what it
 * carried when it was written.
 *
 * `success` on the result means the mail is queued, not that it has left.
 *
 * @param billParticipantId one participation for a bill, several for a reminder to a Hof
 */
export const queueBackgroundEmail = async (
  payload: Payload,
  email: BackgroundEmail,
  billParticipantId?: string | string[],
): Promise<TrackedEmailResult> => {
  const folder = randomUUID();
  const stored: StoredAttachment[] = [];

  try {
    for (const attachment of email.attachments ?? []) {
      const key = `${folder}/${attachment.filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: MAIL_ATTACHMENT_BUCKET_NAME,
          Key: key,
          Body: attachment.content,
          ...(attachment.contentType === undefined ? {} : { ContentType: attachment.contentType }),
        }),
      );
      stored.push({
        filename: attachment.filename,
        key,
        ...(attachment.contentType === undefined ? {} : { contentType: attachment.contentType }),
      });
    }

    const document_ = await payload.create({
      collection: 'outgoing-emails',
      data: {
        to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
        subject: email.subject,
        ...(email.html === undefined ? {} : { html: email.html }),
        ...(email.text === undefined ? {} : { text: email.text }),
        deliveryStatus: 'queued',
        queuedAttachments: stored,
        ...(typeof billParticipantId === 'string' ? { billParticipant: billParticipantId } : {}),
        ...(Array.isArray(billParticipantId) ? { billParticipants: billParticipantId } : {}),
      },
    });

    return { success: true, outgoingEmailId: document_.id };
  } catch (error) {
    await deleteStoredAttachments(payload, stored);
    throw error;
  }
};

/**
 * Takes a mail out of the queue without sending it, and records why on the row.
 *
 * Does nothing to a mail that is no longer queued, so it is safe to call on any row.
 */
export const discardQueuedEmail = async (
  payload: Payload,
  email: Pick<OutgoingEmail, 'id' | 'to' | 'deliveryStatus' | 'queuedAttachments'> & {
    rawSmtpResults?: unknown;
  },
  reason: string,
): Promise<void> => {
  if (email.deliveryStatus !== 'queued') return;

  const results = [
    ...(Array.isArray(email.rawSmtpResults) ? (email.rawSmtpResults as unknown[]) : []),
    { success: false, to: email.to, error: `Not sent: ${reason}` },
  ];
  await payload.update({
    collection: 'outgoing-emails',
    id: email.id,
    data: {
      deliveryStatus: 'error',
      smtpResults: results,
      rawSmtpResults: results,
      queuedAttachments: [],
    },
  });
  await deleteStoredAttachments(payload, readStoredAttachments(email.queuedAttachments));
};

/**
 * Discards every queued mail to one participation.
 *
 * For whoever is about to send that participation a newer mail: the queued one would
 * otherwise follow it hours later, with the attachment it was queued with.
 */
export const discardQueuedEmailsFor = async (
  payload: Payload,
  billParticipantId: string,
  reason: string,
): Promise<void> => {
  const queued = await payload.find({
    collection: 'outgoing-emails',
    where: {
      and: [
        { deliveryStatus: { equals: 'queued' } },
        { billParticipant: { equals: billParticipantId } },
      ],
    },
    limit: 100,
  });
  for (const email of queued.docs) await discardQueuedEmail(payload, email, reason);
};

/** Fetches the attachments a queued mail was written with. */
export const loadQueuedAttachments = async (
  email: Pick<OutgoingEmail, 'queuedAttachments'>,
): Promise<NonNullable<BackgroundEmail['attachments']>> => {
  const attachments: NonNullable<BackgroundEmail['attachments']> = [];
  for (const attachment of readStoredAttachments(email.queuedAttachments)) {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: MAIL_ATTACHMENT_BUCKET_NAME, Key: attachment.key }),
    );
    if (!response.Body) throw new Error(`Queued attachment ${attachment.key} is empty.`);
    attachments.push({
      filename: attachment.filename,
      content: Buffer.from(await response.Body.transformToByteArray()),
      ...(attachment.contentType === undefined ? {} : { contentType: attachment.contentType }),
    });
  }
  return attachments;
};

/** The oldest queued mails, at most as many as an hour's budget could ever send. */
const findQueued = async (
  payload: Payload,
  linkedToOneParticipant: boolean,
  limit: number,
): Promise<OutgoingEmail[]> => {
  const found = await payload.find({
    collection: 'outgoing-emails',
    where: {
      and: [
        { deliveryStatus: { equals: 'queued' } },
        { billParticipant: { exists: linkedToOneParticipant } },
      ],
    },
    sort: 'createdAt',
    limit,
  });
  return found.docs;
};

/**
 * Sends queued mails, oldest first, until the queue is empty or the hourly budget is used up.
 *
 * Bills come last. They are the one kind of mail that arrives by the thousand, and a
 * weekly report or a reminder queued behind them would otherwise wait for days.
 *
 * A mail is marked `pending` before it is handed to the mail server and never returns to
 * `queued`. A replica that dies in between leaves that one mail in `pending` for a person
 * to look at, which is the better failure than a participant receiving a bill twice.
 *
 * @param batchSize how many mails to look at in one run; an hour's budget is the most that could go out
 */
export const drainEmailOutbox = async (
  payload: Payload,
  batchSize: number,
  hooks: OutboxDrainHooks = {},
): Promise<OutboxDrainSummary> => {
  const summary: OutboxDrainSummary = { sent: 0, failed: 0, discarded: 0, budgetExhausted: false };

  // Both replicas pick up the same scheduled job, and two drains would each read the same
  // queued rows before either had marked one as taken.
  const token = randomUUID();
  const locked = await redis.set(DRAIN_LOCK_KEY, token, 'PX', DRAIN_LOCK_TTL_MS, 'NX');
  if (locked !== 'OK') return { ...summary, duplicate: true };

  try {
    const queue = [
      ...(await findQueued(payload, false, batchSize)),
      ...(await findQueued(payload, true, batchSize)),
    ];

    for (const email of queue) {
      const staleReason = await hooks.staleReason?.(email);
      if (staleReason !== undefined) {
        await discardQueuedEmail(payload, email, staleReason);
        summary.discarded++;
        continue;
      }

      if (!(await reserveBackgroundEmail())) {
        summary.budgetExhausted = true;
        break;
      }

      await payload.update({
        collection: 'outgoing-emails',
        id: email.id,
        data: { deliveryStatus: 'pending' },
      });

      let delivered = false;
      try {
        const attachments = await loadQueuedAttachments(email);
        const result = await sendTrackedEmail(
          payload,
          {
            to: email.to,
            subject: email.subject,
            ...(typeof email.html === 'string' && email.html !== '' ? { html: email.html } : {}),
            ...(typeof email.text === 'string' && email.text !== '' ? { text: email.text } : {}),
            attachments,
          },
          undefined,
          undefined,
          email.id,
        );
        delivered = result.success;
      } catch (error) {
        payload.logger.error({ err: error, msg: `Queued mail ${email.id} could not be sent.` });
        await payload.update({
          collection: 'outgoing-emails',
          id: email.id,
          data: { deliveryStatus: 'error' },
        });
      }

      // Kept after a failed send, so that "resend" on the row still carries them.
      if (delivered) {
        await releaseQueuedAttachments(payload, email);
        summary.sent++;
      } else {
        summary.failed++;
      }
    }
  } finally {
    await redis.eval(RELEASE_SCRIPT, 1, DRAIN_LOCK_KEY, token);
  }

  return summary;
};
