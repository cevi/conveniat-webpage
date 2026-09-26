import type { AppRouter } from '@/trpc/routers/_app';
import type { inferProcedureInput } from '@trpc/server';

export type SendMessageInput = inferProcedureInput<AppRouter['chat']['sendMessage']>;

/**
 * The exact input of every send that failed in this session, keyed by message id, so a retry
 * replays it (type, quote, thread) rather than rebuilding it from the bubble. After a reload
 * only the bubble survives, and the retry falls back to its text.
 */
const failedSendInputs = new Map<string, SendMessageInput>();

/** Records the input of a send that failed, for {@link takeFailedSend}. */
export const rememberFailedSend = (messageId: string, input: SendMessageInput): void => {
  failedSendInputs.set(messageId, input);
};

/** Returns and forgets the input of a failed send, if this session still has it. */
export const takeFailedSend = (messageId: string): SendMessageInput | undefined => {
  const input = failedSendInputs.get(messageId);
  failedSendInputs.delete(messageId);
  return input;
};
