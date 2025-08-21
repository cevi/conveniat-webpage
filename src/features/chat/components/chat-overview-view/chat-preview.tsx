'use client';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatType } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { de as deLocale, fr as frLocale } from 'date-fns/locale';
import { Siren, Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import type React from 'react';

export const ChatPreview: React.FC<{
  chat: ChatWithMessagePreview;
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

  const timestamp = formatDistanceToNow(new Date(chat.lastMessage.createdAt), {
    addSuffix: true,
    // Only pass locale if defined, otherwise omit for English fallback
    ...(localeToUse ? { locale: localeToUse } : {}),
  });

  const { data: chatDetails } = useChatDetail(chat.id);

  // Determine participant count for group chats
  const participantCount = chatDetails?.participants.length ?? 0;

  return (
    <Link href={chatDetailLink} className="block w-full">
      <li
        className={cn(
          'relative flex items-center space-x-4 rounded-lg p-4 transition-all duration-200',
          'hover:shadow-sm',
          {},
        )}
      >
        <div className="shrink-0">
          {chat.chatType === ChatType.GROUP && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 shadow-sm">
              <Users size={20} className="text-gray-600" />
            </div>
          )}
          {chat.chatType === ChatType.ONE_TO_ONE && (
            <div className="bg-conveniat-green flex h-12 w-12 items-center justify-center rounded-full shadow-sm">
              <span className="font-heading text-sm font-semibold text-white">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {chat.chatType === ChatType.EMERGENCY && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 shadow-sm">
              <Siren size={20} className="text-red-600" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p
                className={cn('font-heading truncate text-sm', {
                  'font-semibold text-gray-900': hasUnread,
                  'font-medium text-gray-800': !hasUnread,
                  'text-red-50': chat.chatType === ChatType.EMERGENCY,
                })}
              >
                {chat.name}
              </p>
              {chat.chatType === ChatType.GROUP && (
                <span className="font-body rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {participantCount}
                </span>
              )}
            </div>
            <span
              className={cn('font-body text-xs text-gray-500', {
                'text-red-50': chat.chatType === ChatType.EMERGENCY,
              })}
            >
              {timestamp}
            </span>
          </div>

          <p
            className={cn('font-body mt-1 truncate text-sm', {
              'font-medium text-gray-700': hasUnread,
              'text-gray-500': !hasUnread,
              'text-red-50': chat.chatType === ChatType.EMERGENCY,
            })}
          >
            {/* TODO: consider do that server side */}
            {chat.lastMessage.messagePreview}
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
