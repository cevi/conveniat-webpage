import type { ChatMessage } from '@/features/chat/api/types';
import type { AppRouter } from '@/trpc/routers/_app';
import type { inferProcedureInput } from '@trpc/server';

export type SendMessageInput = inferProcedureInput<AppRouter['chat']['sendMessage']>;

interface FailedSend {
  input: SendMessageInput;
  message: ChatMessage;
}

const FAILED_SENDS_KEY = 'conveniat-failed-sends';
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
  writeFailedSends([...others, { input, message: { ...message, sendFailed: true } }]);
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

/** The failed messages of one chat (or thread), as bubbles to merge into the list. */
export const getFailedChatMessages = (chatId: string, parentId?: string): ChatMessage[] =>
  readFailedSends()
    .filter((send) => send.input.chatId === chatId && send.input.parentId === parentId)
    .map((send) => send.message);
