import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { chatPubSub } from '@/lib/db/chat-pubsub';
import { redis } from '@/lib/db/redis';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction, StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('chat:call');

/** Far longer than any call; a call whose end never arrives is dropped without an entry. */
const CALL_RECORD_TTL_SECONDS = 6 * 60 * 60;

const keyOf = (callId: string): string => `chat:call:${callId}`;

interface CallRecord {
  chatId: string;
  callerName: string;
  /** Epoch milliseconds the callee picked up; unset while it rings. */
  acceptedAt?: number;
}

/** How a call ended, for its line in the chat. */
export type CallOutcome = 'ended' | 'declined';

/** "2:14", or "1:02:14" past an hour, like the line of a call on a phone. */
export const formatCallDuration = (milliseconds: number): string => {
  const total = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
};

/**
 * The call's line in the chat, the same for both of them, so it names who called: a call
 * taken with its length, one nobody took, or one declined.
 */
export const callMessagePayload = (
  callerName: string,
  outcome: CallOutcome,
  durationMs: number | undefined,
): StaticTranslationString => {
  if (outcome === 'declined') {
    return {
      de: `Abgelehnter Anruf von ${callerName}`,
      en: `Declined call from ${callerName}`,
      fr: `Appel refusé de ${callerName}`,
    };
  }
  if (durationMs === undefined) {
    return {
      de: `Verpasster Anruf von ${callerName}`,
      en: `Missed call from ${callerName}`,
      fr: `Appel manqué de ${callerName}`,
    };
  }
  const duration = formatCallDuration(durationMs);
  return {
    de: `Anruf von ${callerName} · ${duration}`,
    en: `Call from ${callerName} · ${duration}`,
    fr: `Appel de ${callerName} · ${duration}`,
  };
};

/** Notes a call that starts ringing, so its end can be written into the chat. */
export const recordCallStarted = async (
  callId: string,
  chatId: string,
  callerName: string,
): Promise<void> => {
  // by the Ceviname, as the chat's other lines name people ("Anna hat den Chat erstellt")
  const record: CallRecord = { chatId, callerName: splitDisplayName(callerName).primary };
  await redis.set(keyOf(callId), JSON.stringify(record), 'EX', CALL_RECORD_TTL_SECONDS, 'NX');
};

const readRecord = (value: string | null): CallRecord | undefined => {
  if (value === null) return undefined;
  try {
    return JSON.parse(value) as CallRecord;
  } catch {
    return undefined;
  }
};

/** Notes that the call was taken; the first device to pick up sets the start of its length. */
export const recordCallAccepted = async (callId: string): Promise<void> => {
  const record = readRecord(await redis.get(keyOf(callId)));
  if (record === undefined || record.acceptedAt !== undefined) return;
  const accepted: CallRecord = { ...record, acceptedAt: Date.now() };
  await redis.set(keyOf(callId), JSON.stringify(accepted), 'KEEPTTL');
};

/**
 * Writes the ended call into its chat, once: both sides may send the end, and only the first
 * finds the record. Ignored for a call of another chat, which a member cannot end.
 */
export const recordCallEnded = async (
  prisma: PrismaClientOrTransaction,
  callId: string,
  chatId: string,
  outcome: CallOutcome,
  /** Who ended it, as the event's sender. */
  endedBy: string,
): Promise<void> => {
  const record = readRecord(await redis.getdel(keyOf(callId)));
  if (record?.chatId !== chatId) return;

  const durationMs =
    outcome === 'ended' && record.acceptedAt !== undefined
      ? Date.now() - record.acceptedAt
      : undefined;
  const payload = callMessagePayload(record.callerName, outcome, durationMs);

  const message = await prisma.message.create({
    data: {
      chatId,
      type: MessageType.SYSTEM_MSG,
      contentVersions: { create: [{ payload }] },
      messageEvents: {
        create: [{ type: MessageEventType.CREATED }, { type: MessageEventType.STORED }],
      },
    },
  });
  await prisma.chat.update({ where: { uuid: chatId }, data: { lastUpdate: new Date() } });

  chatPubSub
    .publish({
      type: 'new_message',
      chatId,
      senderId: endedBy,
      message: {
        id: message.uuid,
        createdAt: message.createdAt,
        messagePayload: payload,
        senderId: undefined,
        status: MessageEventType.STORED,
        type: MessageType.SYSTEM_MSG,
      },
    })
    .catch((error: unknown) => {
      logger.error('Failed to publish the call system message', {
        error,
        'chat.id': chatId,
        'chat.call.id': callId,
      });
    });
};
