import type { ChatMessage } from '@/features/chat/api/types';
import type { PrismaClientOrTransaction } from '@/types/types';

type MessagePayload = ChatMessage['messagePayload'];

/**
 * What a message says to a reader: its latest content, or nothing once its sender deleted it.
 * The stored content stays in the database, but no read hands it out again, and with it the
 * key of a deleted image.
 *
 * @param message - a message with its latest content version first
 * @returns the payload to send to a client
 */
export const visiblePayloadOf = (message: {
  deletedAt?: Date | null | undefined;
  contentVersions: { payload: unknown }[];
}): MessagePayload => {
  if (message.deletedAt !== null && message.deletedAt !== undefined) return {};
  const payload = message.contentVersions[0]?.payload;
  return payload === null || payload === undefined ? {} : payload;
};

/** The id of the message a payload quotes, if it quotes one. */
export const quotedMessageIdOf = (payload: unknown): string | undefined => {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const quotedId = (payload as Record<string, unknown>)['quotedMessageId'];
  return typeof quotedId === 'string' && quotedId !== '' ? quotedId : undefined;
};

/**
 * Which of the messages quoted by `payloads` were deleted. One query for a whole page, and
 * none when nothing on it quotes anything.
 */
export const findDeletedQuotedMessageIds = async (
  prisma: PrismaClientOrTransaction,
  payloads: unknown[],
): Promise<Set<string>> => {
  const quotedIds = [
    ...new Set(payloads.map((payload) => quotedMessageIdOf(payload)).filter(Boolean)),
  ] as string[];
  if (quotedIds.length === 0) return new Set();
  const deleted = await prisma.message.findMany({
    // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
    where: { uuid: { in: quotedIds }, deletedAt: { not: null } },
    select: { uuid: true },
  });
  return new Set(deleted.map((message) => message.uuid));
};

/**
 * A quote keeps a line of what it quotes in its own payload. Once that message is deleted the
 * line goes too, so a deleted text does not live on in the answers to it.
 *
 * @returns the payload, and whether its quote points at a deleted message
 */
export const withoutDeletedQuote = (
  payload: MessagePayload,
  deletedQuotedIds: ReadonlySet<string>,
): { payload: MessagePayload; quotedMessageDeleted: boolean } => {
  const quotedId = quotedMessageIdOf(payload);
  if (quotedId === undefined || !deletedQuotedIds.has(quotedId)) {
    return { payload, quotedMessageDeleted: false };
  }
  const rest = Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([key]) => key !== 'quotedSnippet'),
  );
  return { payload: rest as MessagePayload, quotedMessageDeleted: true };
};
