'use client';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import type { ChatDto } from '@/features/chat/types/api-dto-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import type React from 'react';

import { de as deLocale, fr as frLocale } from 'date-fns/locale';

const noMessagesYetText: StaticTranslationString = {
  de: 'Noch keine Nachrichten',
  en: 'No messages yet',
  fr: 'Aucun message pour le moment',
};

export const ChatPreview: React.FC<{
  chat: ChatDto;
  // eslint-disable-next-line complexity
}> = ({ chat }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatDetailLink = `/app/chat/${chat.id}`;
  const hasUnread = chat.unreadCount > 0;

  let localeToUse: typeof deLocale | typeof frLocale | undefined;
  switch (locale) {
    case 'de': {
      localeToUse = deLocale;
      break;
    }
    case 'fr': {
      localeToUse = frLocale;
      break;
    }
    case 'en': {
      // English is default, so leave localeToUse undefined
      localeToUse = undefined;
      break;
    }
    default: {
      // Fallback for any other locale
      localeToUse = undefined;
      break;
    }
  }

  const timestamp = chat.lastMessage?.timestamp
    ? formatDistanceToNow(new Date(chat.lastMessage.timestamp), {
        addSuffix: true,
        // Only pass locale if defined, otherwise omit for English fallback
        ...(localeToUse ? { locale: localeToUse } : {}),
      })
    : '';

  const { data: chatDetails } = useChatDetail(chat.id);

  // Determine participant count for group chats
  const participantCount = chatDetails?.participants.length ?? 0;
  const isGroupChat = participantCount > 2;

  return (
    <Link href={chatDetailLink} className="block w-full">
      <li
        className={cn(
          'relative flex items-center space-x-4 rounded-lg p-4 transition-all duration-200',
          'hover:bg-gray-100 hover:shadow-sm',
          hasUnread ? 'border-conveniat-green border-l-4 bg-green-50' : 'bg-white',
        )}
      >
        <div className="shrink-0">
          {isGroupChat ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 shadow-sm">
              <Users size={20} className="text-gray-600" />
            </div>
          ) : (
            <div className="bg-conveniat-green flex h-12 w-12 items-center justify-center rounded-full shadow-sm">
              <span className="font-heading text-sm font-semibold text-white">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  'font-heading truncate text-sm',
                  hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800',
                )}
              >
                {chat.name}
              </p>
              {isGroupChat && (
                <span className="font-body rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {participantCount}
                </span>
              )}
            </div>
            <span className="font-body text-xs text-gray-500">{timestamp}</span>
          </div>

          <p
            className={cn(
              'font-body mt-1 truncate text-sm',
              hasUnread ? 'font-medium text-gray-700' : 'text-gray-500',
            )}
          >
            {chat.lastMessage?.content ?? noMessagesYetText[locale]}
          </p>
        </div>

        {hasUnread && (
          <div className="bg-conveniat-green font-body flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm">
            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
          </div>
        )}
      </li>
    </Link>
  );
};
