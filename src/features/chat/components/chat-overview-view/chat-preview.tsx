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
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, LifeBuoy, Megaphone, Pin, Siren, Users } from 'lucide-react';
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
    <div
      aria-busy={pending}
      className={cn('flex min-h-[72px] items-center gap-3 px-4 py-3', pending && 'animate-pulse')}
    >
      {children}
    </div>
  );
};

/** The round picture at the start of a row: the partner, or what kind of chat it is. */
const ChatAvatar: React.FC<{ chat: ChatWithMessagePreview }> = ({ chat }) => {
  if (chat.chatType === ChatType.ONE_TO_ONE) {
    return (
      <PersonAvatar
        seed={chat.partner?.userId ?? chat.id}
        name={chat.name}
        pictureUrl={chat.partner?.pictureUrl}
        className="h-11 w-11 text-sm"
      />
    );
  }
  if (chat.chatType === ChatType.EMERGENCY) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 ring-2 ring-red-500">
        <Siren className="h-5 w-5 text-red-600" aria-hidden="true" />
      </span>
    );
  }
  const icons: Partial<Record<ChatType, LucideIcon>> = {
    [ChatType.SUPPORT_GROUP]: LifeBuoy,
    [ChatType.ANNOUNCEMENT]: Megaphone,
    [ChatType.COURSE_GROUP]: CalendarDays,
  };
  const Icon = icons[chat.chatType] ?? Users;
  return (
    <span className="text-conveniat-green bg-tint flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
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

  const isEmergency = chat.chatType === ChatType.EMERGENCY;

  return (
    <Link
      href={chatDetailLink}
      className="hover:bg-page block w-full bg-white"
      onMouseEnter={handlePrefetch}
    >
      <ChatPreviewRow>
        <ChatAvatar chat={chat} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                'min-w-0 flex-1 truncate text-[15px] leading-5 font-semibold text-green-900',
                isEmergency && 'text-red-700',
              )}
            >
              {chat.name}
            </p>
            <span
              className={cn(
                'shrink-0 text-xs whitespace-nowrap text-green-500 tabular-nums',
                hasUnread && 'text-conveniat-green font-semibold',
                isEmergency && 'text-red-700',
              )}
            >
              {timestamp}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            {chat.caseNumber != undefined && chat.caseNumber !== '' && (
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold',
                  isEmergency ? 'bg-red-50 text-red-700' : 'bg-chip text-green-900',
                )}
              >
                {chat.caseNumber}
              </span>
            )}
            <p
              className={cn(
                'min-w-0 flex-1 truncate text-sm leading-5 text-green-700',
                hasUnread && 'font-semibold text-green-900',
              )}
            >
              {senderPrefix}
              {previewText}
            </p>
            {chat.isPinned === true && (
              <Pin
                className="h-4 w-4 shrink-0 text-green-500"
                aria-label={pinnedText[locale]}
                role="img"
              />
            )}
            {hasUnread && (
              <span
                className={cn(
                  'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white tabular-nums',
                  isEmergency ? 'bg-red-600' : 'bg-conveniat-green',
                )}
              >
                <span aria-hidden="true">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
                <span className="sr-only">
                  {unreadText(chat.unreadCount, chat.isLarge === true, locale)}
                </span>
              </span>
            )}
          </div>
        </div>
      </ChatPreviewRow>
    </Link>
  );
};
