import type { Locale, StaticTranslationString } from '@/types/types';
import { TRPCError } from '@trpc/server';

/**
 * Verifies the chat name based on the number of members.
 * If there is only one member (private chat), the name must be undefined or empty.
 *
 * @param chatName
 * @param members
 */
export const verifyChatName = (
  chatName: string | undefined,
  members: {
    userId: string;
  }[],
): void => {
  if (members.length === 1) {
    if (chatName !== undefined && chatName.trim() !== '') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Private chats (with only one other member) cannot have a name.',
      });
    }
  } else {
    if (chatName === undefined || chatName.trim() === '') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Group chats must have a name.',
      });
    }
  }
};

/** The same bound the create and rename forms show. A longer name ends up in push titles. */
export const CHAT_NAME_MAX_LENGTH = 50;

const chatNameTooLongText: StaticTranslationString = {
  de: `Der Chat-Name darf höchstens ${CHAT_NAME_MAX_LENGTH} Zeichen lang sein.`,
  en: `The chat name may be at most ${CHAT_NAME_MAX_LENGTH} characters long.`,
  fr: `Le nom du chat ne doit pas dépasser ${CHAT_NAME_MAX_LENGTH} caractères.`,
};

/**
 * Throws unless the trimmed chat name fits {@link CHAT_NAME_MAX_LENGTH}.
 *
 * @param chatName - the name as the user typed it
 * @param locale - the language of the error message
 */
export const assertChatNameLength = (chatName: string | undefined, locale: Locale): void => {
  if ((chatName?.trim().length ?? 0) > CHAT_NAME_MAX_LENGTH) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: chatNameTooLongText[locale] });
  }
};
