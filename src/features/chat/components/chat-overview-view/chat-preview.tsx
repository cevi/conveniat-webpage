'use client';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { previewSenderPrefix } from '@/features/chat/utils/preview-sender-prefix';
import { trpc } from '@/trpc/client';
import { i18nConfig, type Locale, type StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatType } from '@prisma/client';
import { Megaphone, Pin, Siren, Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link, { useLinkStatus } from 'next/link';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useCallback } from 'react';

const pinnedText: StaticTranslationString = {
  de: 'Angeheftet',
  en: 'Pinned',
  fr: 'Épinglé',
};

/**
 * What the unread badge says to a screen reader. A large chat caps its count at 1, so it only
 * says that there is something new.
 */
const unreadText = (count: number, isLarge: boolean, locale: Locale): string => {
  if (isLarge) {
    if (locale === 'de') return 'Neue Nachrichten';
    if (locale === 'fr') return 'Nouveaux messages';
    return 'New messages';
  }
  if (count === 1) {
    if (locale === 'de') return '1 ungelesene Nachricht';
    if (locale === 'fr') return '1 message non lu';
    return '1 unread message';
  }
  if (locale === 'de') return `${count} ungelesene Nachrichten`;
  if (locale === 'fr') return `${count} messages non lus`;
  return `${count} unread messages`;
};

/**
 * The row of a chat, pulsing from the tap until the chat has opened, so a tap that takes a
 * while, as it does offline, is not mistaken for one that did nothing.
 */
const ChatPreviewRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pending } = useLinkStatus();
  return (
    <li
      aria-busy={pending}
      className={cn(
        'relative flex items-center space-x-4 rounded-lg p-4 transition-all duration-200',
        'hover:shadow-sm',
        pending && 'animate-pulse',
      )}
    >
      {children}
    </li>
  );
};

export const ChatPreview: React.FC<{
  chat: ChatWithMessagePreview;
}> = ({ chat }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const trpcUtils = trpc.useUtils();
  const { data: currentUserId } = trpc.chat.user.useQuery({});

  // On hover, which a phone emulates for a completed tap only. `touchstart` also fired for
  // every chat a finger brushed while scrolling the list, each one a request.
  const handlePrefetch = useCallback(() => {
    trpcUtils.chat.chatDetails.prefetch({ chatId: chat.id }).catch(() => {});
    // Only for a chat with nothing cached, so it opens with messages: the view refetches
    // the list on mount anyway. The key has to match the view's, or nothing reads it.
    trpcUtils.chat.infiniteMessages
      .prefetchInfinite({ chatId: chat.id, limit: CHAT_PAGE_SIZE }, { staleTime: Infinity })
      .catch(() => {});
  }, [chat.id, trpcUtils]);

  let chatDetailLink = `/app/chat/${chat.id}`;

  // Forward share parameters if present
  const shareText = searchParameters.get('text');
  const shareTitle = searchParameters.get('title');
  const shareUrl = searchParameters.get('url');

  if (shareText || shareTitle || shareUrl) {
    const params = new URLSearchParams();
    if (shareText) params.set('text', shareText);
    if (shareTitle) params.set('title', shareTitle);
    if (shareUrl) params.set('url', shareUrl);
    chatDetailLink += `?${params.toString()}`;
  }

  const hasUnread = chat.unreadCount > 0;
  const { formatMessageTime } = useFormatDate();

  const messageDate = chat.lastMessage?.createdAt ?? chat.lastUpdate;
  const timestamp = formatMessageTime(new Date(messageDate));

  const rawPreview = chat.lastMessage?.messagePreview;
  let previewText = '';
  if (typeof rawPreview === 'string') {
    previewText = rawPreview;
  } else if (rawPreview) {
    previewText = rawPreview[locale];
  }
  const senderPrefix = previewSenderPrefix(chat.lastMessage, chat.chatType, currentUserId, locale);

  return (
    <Link href={chatDetailLink} className="block w-full" onMouseEnter={handlePrefetch}>
      <ChatPreviewRow>
        <div className="shrink-0">
          {chat.chatType === ChatType.GROUP && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 shadow-sm">
              <Users size={20} className="text-gray-600" />
            </div>
          )}
          {chat.chatType === ChatType.ONE_TO_ONE && (
            <PersonAvatar
              seed={chat.partner?.userId ?? chat.id}
              name={chat.name}
              pictureUrl={chat.partner?.pictureUrl}
              className="h-12 w-12 text-sm shadow-sm"
            />
          )}
          {chat.chatType === ChatType.EMERGENCY && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-red-500">
              <Siren size={20} className="text-red-500" />
            </div>
          )}
          {chat.chatType === ChatType.SUPPORT_GROUP && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 shadow-sm">
              <Siren size={20} className="text-blue-500" />
            </div>
          )}
          {chat.chatType === ChatType.ANNOUNCEMENT && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 shadow-md ring-2 ring-rose-500">
              <Megaphone size={20} className="text-rose-500" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-1 flex-col pr-2">
              <div className="flex items-center gap-2">
                <p
                  className={cn('font-heading truncate text-sm font-semibold', {
                    'text-gray-900': hasUnread,
                    'text-gray-800': !hasUnread,
                    'text-red-500': chat.chatType === ChatType.EMERGENCY,
                    'text-rose-600': chat.chatType === ChatType.ANNOUNCEMENT,
                  })}
                >
                  {chat.name}
                </p>
                {chat.isPinned === true && (
                  <Pin
                    size={14}
                    className="shrink-0 text-gray-400"
                    aria-label={pinnedText[locale]}
                    role="img"
                  />
                )}
                {chat.caseNumber != undefined && chat.caseNumber !== '' && (
                  <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-700">
                    {chat.caseNumber}
                  </span>
                )}
              </div>
            </div>
            <span
              className={cn('font-body shrink-0 text-xs whitespace-nowrap text-gray-500', {
                'text-red-500': chat.chatType === ChatType.EMERGENCY,
              })}
            >
              {timestamp}
            </span>
          </div>

          <p
            className={cn('font-body mt-1 truncate text-sm', {
              'font-medium text-gray-700': hasUnread,
              'text-gray-500': !hasUnread,
              'text-red-500': chat.chatType === ChatType.EMERGENCY,
            })}
          >
            {senderPrefix}
            {previewText}
          </p>
        </div>

        {hasUnread && (
          <div className="bg-conveniat-green font-body flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm">
            <span aria-hidden="true">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
            <span className="sr-only">
              {unreadText(chat.unreadCount, chat.isLarge === true, locale)}
            </span>
          </div>
        )}
      </ChatPreviewRow>
    </Link>
  );
};
