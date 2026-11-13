import type { ChatMessage } from '@/features/chat/api/types';
import { isMessageDeleted } from '@/features/chat/utils/message-deletion';
import { MESSAGE_EDIT_WINDOW_MS } from '@/lib/forum-shared';
import { MessageEventType, MessageType } from '@/lib/prisma/enums';
import type { StaticTranslationString } from '@/types/types';

/** The text of a message, for the clipboard; undefined where there is none, as on an image. */
export const messageTextOf = (payload: ChatMessage['messagePayload']): string | undefined => {
  // a restored cache may hold anything here
  const value: unknown = payload;
  if (value === null || value === undefined) return undefined;
  const text: unknown =
    typeof value === 'string' ? value : (value as Record<string, unknown>)['text'];
  return typeof text === 'string' && text.trim() !== '' ? text : undefined;
};

/**
 * Whether the user may still change the text of this message, as `editMessage` checks it: their
 * own text, stored by the server, not deleted, sent less than a day ago. Whether they may write
 * in the chat at all is up to the caller.
 */
export const isMessageTextEditable = (
  message: ChatMessage,
  isCurrentUser: boolean,
  now: number = Date.now(),
): boolean => {
  if (!isCurrentUser || message.type !== MessageType.TEXT_MSG) return false;
  if (message.sendFailed === true || message.isPendingOffline === true) return false;
  if (message.status === MessageEventType.CREATED) return false;
  if (isMessageDeleted(message) || message.forumRemoval?.kind === 'DELETED') return false;
  if (messageTextOf(message.messagePayload) === undefined) return false;
  const sentAt = new Date(message.createdAt).getTime();
  return !Number.isNaN(sentAt) && now - sentAt < MESSAGE_EDIT_WINDOW_MS;
};

/** After the time of a message whose sender changed its text. */
export const editedLabelText: StaticTranslationString = {
  de: 'Bearbeitet',
  en: 'Edited',
  fr: 'Modifié',
};

/** Whether the sender changed the text; read defensively, a persisted cache lacks the field. */
export const isMessageEdited = (message: ChatMessage): boolean => {
  const editedAt: unknown = message.editedAt;
  if (editedAt === undefined || editedAt === null) return false;
  if (!(editedAt instanceof Date) && typeof editedAt !== 'string') return false;
  return !Number.isNaN(new Date(editedAt).getTime());
};
