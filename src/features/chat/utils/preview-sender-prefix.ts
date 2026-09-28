import type { PreviewMessage } from '@/features/chat/types/api-dto-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { ChatType } from '@prisma/client';

const youText: StaticTranslationString = {
  de: 'Du',
  en: 'You',
  fr: 'Vous',
};

/** French sets a (non-breaking) space before the colon. */
const separatorText: StaticTranslationString = {
  de: ': ',
  en: ': ',
  fr: ' : ',
};

/**
 * Who wrote the last message of a chat, as the chat overview puts it in front of the preview:
 * "Du: " for the user's own messages and the sender's name in a group chat, like the bubbles of
 * a group chat carry it. Other chats, system messages and senders whose name a cached list does
 * not know get no prefix.
 *
 * @param lastMessage - the chat's last message, possibly from a list persisted by an older version
 * @param chatType - the type of the chat
 * @param currentUserId - uuid of the signed-in user, undefined while unknown
 * @param locale - the locale of the overview
 * @returns the prefix including its separator, or an empty string
 */
export const previewSenderPrefix = (
  lastMessage: PreviewMessage | undefined,
  chatType: ChatType,
  currentUserId: string | undefined,
  locale: Locale,
): string => {
  if (lastMessage === undefined) return '';

  if (currentUserId !== undefined && lastMessage.senderId === currentUserId) {
    return `${youText[locale]}${separatorText[locale]}`;
  }

  const senderName = lastMessage.senderName?.trim() ?? '';
  if (chatType === 'GROUP' && senderName !== '') {
    return `${senderName}${separatorText[locale]}`;
  }

  return '';
};
