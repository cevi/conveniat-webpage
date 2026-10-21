import type { ChatMessage } from '@/features/chat/api/types';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { i18nConfig, type Locale } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

/** What `createNewChat` stores as the first message, in the creator's language. */
const NEW_CHAT_TEXTS = new Set(['Neuer Chat erstellt', 'New Chat created', 'Nouveau chat créé']);

const createdByYouText = (isGroup: boolean, locale: Locale): string => {
  if (locale === 'de') return isGroup ? 'Du hast die Gruppe erstellt' : 'Du hast den Chat erstellt';
  if (locale === 'fr') return isGroup ? 'Tu as créé le groupe' : 'Tu as créé le chat';
  return isGroup ? 'You created the group' : 'You created the chat';
};

const createdByText = (name: string, isGroup: boolean, locale: Locale): string => {
  if (locale === 'de')
    return isGroup ? `${name} hat die Gruppe erstellt` : `${name} hat den Chat erstellt`;
  if (locale === 'fr') return isGroup ? `${name} a créé le groupe` : `${name} a créé le chat`;
  return isGroup ? `${name} created the group` : `${name} created the chat`;
};

/**
 * Renders a system message in the chat: a quiet centred line with its time.
 *
 * The first message of a chat only says that it was created; the chat's owner, who created
 * it unless they left and handed it over, says by whom.
 */
export const SystemMessage: React.FC<{
  message: ChatMessage;
  /** the owner of the chat, see above; missing when nobody owns it any more */
  creator?: { id: string; name: string } | undefined;
  currentUserId?: string | undefined;
  isGroup?: boolean;
}> = ({ message, creator, currentUserId, isGroup = false }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const isCreation =
    typeof message.messagePayload === 'string' && NEW_CHAT_TEXTS.has(message.messagePayload);

  let content: React.ReactNode = formatMessageContent(message.messagePayload, locale);
  if (isCreation && creator !== undefined) {
    content =
      creator.id === currentUserId
        ? createdByYouText(isGroup, locale)
        : createdByText(splitDisplayName(creator.name).primary, isGroup, locale);
  }

  return (
    <div
      id={`message-${message.id}`}
      className="flex items-center justify-center px-4 py-1 text-[13px] text-green-700"
    >
      <span className="text-center text-balance" style={{ whiteSpace: 'pre-wrap' }}>
        {content}
        <span className="tabular-nums">
          {' · '}
          {formatMessageTimeOnlyRaw(message.createdAt, locale)}
        </span>
      </span>
    </div>
  );
};
