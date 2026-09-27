import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_FAILED_SENDS_STORAGE_KEY } from '@/lib/chat-local-storage';
import type { AppRouter } from '@/trpc/routers/_app';
import type { inferProcedureInput } from '@trpc/server';

export type SendMessageInput = inferProcedureInput<AppRouter['chat']['sendMessage']>;

interface FailedSend {
  input: SendMessageInput;
  message: ChatMessage;
}

const FAILED_SENDS_KEY = CHAT_FAILED_SENDS_STORAGE_KEY;
export const FAILED_SENDS_UPDATED_EVENT = 'conveniat:failed-sends-updated';

/**
 * Sends the server refused, kept in localStorage like the offline outbox. The message query
 * refetches on mount and focus and would otherwise drop a bubble the server never stored,
 * taking the only copy of its text with it. The exact input is kept so a retry replays it
 * (type, quote, thread) rather than rebuilding it from the bubble.
 */
const readFailedSends = (): FailedSend[] => {
  try {
    const raw = localStorage.getItem(FAILED_SENDS_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as FailedSend[];
    // JSON turns dates into strings
    return parsed.map(({ input, message }) => ({
      input: { ...input, timestamp: new Date(String(input.timestamp)) },
      message: { ...message, createdAt: new Date(message.createdAt), sendFailed: true },
    }));
  } catch {
    return [];
  }
};

const writeFailedSends = (sends: FailedSend[]): void => {
  try {
    if (sends.length === 0) localStorage.removeItem(FAILED_SENDS_KEY);
    else localStorage.setItem(FAILED_SENDS_KEY, JSON.stringify(sends));
    globalThis.dispatchEvent(new Event(FAILED_SENDS_UPDATED_EVENT));
  } catch {
    // storage full or blocked: the bubble still shows until the next refetch
  }
};

/** Records a send that failed, replacing an earlier failure of the same message. */
export const rememberFailedSend = (message: ChatMessage, input: SendMessageInput): void => {
  const others = readFailedSends().filter((send) => send.message.id !== message.id);
  // a queued message that failed for good is no longer queued, and the queued clock would win
  const failed = { ...message, sendFailed: true, isPendingOffline: false };
  writeFailedSends([...others, { input, message: failed }]);
};

/** The input of a failed send, for a retry that replays it exactly. */
export const getFailedSendInput = (messageId: string): SendMessageInput | undefined =>
  readFailedSends().find((send) => send.message.id === messageId)?.input;

/** Drops a failed send, once a retry went through or the user deleted it. */
export const forgetFailedSend = (messageId: string): void => {
  const sends = readFailedSends();
  if (!sends.some((send) => send.message.id === messageId)) return;
  writeFailedSends(sends.filter((send) => send.message.id !== messageId));
};

/**
 * The failed messages `currentUser` wrote in one chat (or thread), as bubbles to merge into
 * the list. A bubble's sender is the user who wrote it, so another user logging in on the
 * same phone does not see them.
 */
export const getFailedChatMessages = (
  chatId: string,
  parentId: string | undefined,
  currentUser: string | undefined,
): ChatMessage[] =>
  readFailedSends()
    .filter(
      (send) =>
        send.message.senderId === currentUser &&
        send.input.chatId === chatId &&
        send.input.parentId === parentId,
    )
    .map((send) => send.message);
