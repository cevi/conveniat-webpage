'use client';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { DoubleCheck } from '@/features/chat/components/ui/double-check';
import { PersonName } from '@/features/chat/components/ui/person-name';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useLongPress } from '@/features/chat/hooks/use-long-press';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { formatChatListDate } from '@/features/chat/utils/format-chat-list-date';
import { previewSenderPrefix } from '@/features/chat/utils/preview-sender-prefix';
import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import { i18nConfig, type Locale, type StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatMembershipPermission, ChatType, MessageEventType } from '@prisma/client';
import type { LucideIcon } from 'lucide-react';
import {
  BellOff,
  CalendarDays,
  Check,
  Clock,
  LifeBuoy,
  Loader2,
  Megaphone,
  Pin,
  Siren,
  Users,
} from 'lucide-react';
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

const openingText: StaticTranslationString = {
  de: 'Wird geöffnet …',
  en: 'Opening …',
  fr: 'Ouverture …',
};

/** The row of a chat; busy from the tap until the chat has opened. */
const ChatPreviewRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pending } = useLinkStatus();
  return (
    <div aria-busy={pending} className="flex min-h-[72px] items-center gap-3 px-4 py-3">
      {children}
    </div>
  );
};

/**
 * The date of the last message, or a small spinner in its place from the tap until the chat
 * has opened, so a tap that takes a while, as it does offline, is not mistaken for one that did
 * nothing. The row itself stays still.
 */
const ChatTimestamp: React.FC<{ timestamp: string; className: string; locale: Locale }> = ({
  timestamp,
  className,
  locale,
}) => {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span className={cn(className, 'flex items-center')}>
        <Loader2 className="h-4 w-4 animate-spin text-green-500" aria-hidden="true" />
        <span className="sr-only">{openingText[locale]}</span>
      </span>
    );
  }
  return <span className={className}>{timestamp}</span>;
};

/** The round picture at the start of a row: the partner, or what kind of chat it is. */
export const ChatAvatar: React.FC<{ chat: ChatWithMessagePreview }> = ({ chat }) => {
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
  if (chat.chatType === ChatType.GROUP) {
    // a group gets its initials like a person, marked as a group by a small badge
    return (
      <span className="relative shrink-0">
        <PersonAvatar seed={chat.id} name={chat.name} className="h-11 w-11 text-sm" />
        <span className="ring-line absolute -right-0.5 -bottom-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white ring-1">
          <Users className="h-3 w-3 text-green-700" aria-hidden="true" />
        </span>
      </span>
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

const groupCreatedText: StaticTranslationString = {
  de: 'Du hast die Gruppe erstellt',
  en: 'You created the group',
  fr: 'Tu as créé le groupe',
};

const sentStatusText: Partial<Record<MessageEventType, StaticTranslationString>> = {
  [MessageEventType.CREATED]: { de: 'Wird gesendet', en: 'Sending', fr: 'Envoi' },
  [MessageEventType.STORED]: { de: 'Gesendet', en: 'Sent', fr: 'Envoyé' },
  [MessageEventType.RECEIVED]: { de: 'Zugestellt', en: 'Delivered', fr: 'Distribué' },
  [MessageEventType.READ]: { de: 'Gelesen', en: 'Read', fr: 'Lu' },
};

/** The tick in front of the user's own last message, as its bubble shows it. */
const SentStatus: React.FC<{ status: MessageEventType; locale: Locale }> = ({ status, locale }) => {
  const label = sentStatusText[status]?.[locale];
  if (label === undefined) return <></>;
  let icon: React.ReactNode;
  if (status === MessageEventType.CREATED) {
    icon = <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
  } else if (status === MessageEventType.STORED) {
    icon = <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />;
  } else {
    icon = <DoubleCheck className={status === MessageEventType.READ ? 'text-emerald-600' : ''} />;
  }
  return (
    <span role="img" aria-label={label} className="mr-1 inline-flex align-[-2px] text-green-500">
      {icon}
    </span>
  );
};

const mutedText: StaticTranslationString = {
  de: 'Stummgeschaltet',
  en: 'Muted',
  fr: 'En sourdine',
};

export const ChatPreview: React.FC<{
  chat: ChatWithMessagePreview;
  /** opens the chat's actions on a long press, a right click or the context-menu key */
  onOpenActions?: (chat: ChatWithMessagePreview) => void;
  /** the element that tells a screen reader how to reach those actions */
  actionsHintId?: string;
}> = ({ chat, onOpenActions, actionsHintId }) => {
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

  const longPress = useLongPress(() => onOpenActions?.(chat));
  const hasUnread = chat.unreadCount > 0 || chat.isMarkedUnread === true;
  // a chat marked unread counts as one, also in a cached list from before the mark existed
  const unreadCount = Math.max(chat.unreadCount, hasUnread ? 1 : 0);

  const messageDate = chat.lastMessage?.createdAt ?? chat.lastUpdate;
  const timestamp = formatChatListDate(messageDate, locale, new Date());

  const rawPreview = chat.lastMessage?.messagePreview;
  let previewText = '';
  if (typeof rawPreview === 'string') {
    previewText = rawPreview;
  } else if (rawPreview) {
    previewText = rawPreview[locale];
  }
  let senderPrefix = previewSenderPrefix(chat.lastMessage, chat.chatType, currentUserId, locale);
  const isOwnMessage = currentUserId !== undefined && chat.lastMessage?.senderId === currentUserId;

  // a group with nothing but its creation message, seen by the one who created it
  const isFreshOwnGroup =
    chat.chatType === ChatType.GROUP &&
    chat.lastMessage?.senderId === SYSTEM_SENDER_ID &&
    chat.messageCount <= 1 &&
    chat.userChatPermission === ChatMembershipPermission.OWNER;
  if (isFreshOwnGroup) {
    previewText = groupCreatedText[locale];
    senderPrefix = '';
  }

  const isEmergency = chat.chatType === ChatType.EMERGENCY;

  return (
    <Link
      href={chatDetailLink}
      // an emergency chat is the one row that may be red, so it stands out of the list
      className={cn(
        'hover:bg-quiet block w-full bg-white select-none',
        hasUnread && 'bg-tint',
        isEmergency && 'border-l-4 border-l-red-600 bg-red-50 hover:bg-red-100',
      )}
      data-allow-red={isEmergency ? '' : undefined}
      onMouseEnter={handlePrefetch}
      aria-describedby={onOpenActions === undefined ? undefined : actionsHintId}
      // a held finger opens the actions, not the phone's own menu or a text selection
      style={{ WebkitTouchCallout: 'none' }}
      {...(onOpenActions === undefined ? {} : longPress)}
    >
      <ChatPreviewRow>
        <ChatAvatar chat={chat} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {/* a private chat is named after the partner, in the one way every screen names people */}
            {chat.chatType === ChatType.ONE_TO_ONE ? (
              <PersonName
                name={chat.name}
                className="min-w-0 text-[15px] leading-5"
                primaryClassName={hasUnread ? 'font-bold' : undefined}
              />
            ) : (
              <p
                className={cn(
                  'min-w-0 truncate text-[15px] leading-5 text-green-900',
                  hasUnread ? 'font-bold' : 'font-semibold',
                  isEmergency && 'text-red-700',
                )}
              >
                {chat.name}
              </p>
            )}
            {chat.isPinned === true && (
              <Pin
                className="h-3.5 w-3.5 shrink-0 text-green-500"
                aria-label={pinnedText[locale]}
                role="img"
              />
            )}
            {chat.isMuted === true && (
              <BellOff
                className="ml-auto h-3.5 w-3.5 shrink-0 text-green-500"
                aria-label={mutedText[locale]}
                role="img"
              />
            )}
            <ChatTimestamp
              timestamp={timestamp}
              locale={locale}
              className={cn(
                chat.isMuted !== true && 'ml-auto',
                'shrink-0 pl-1 text-xs whitespace-nowrap text-green-700 tabular-nums',
                hasUnread && 'font-bold text-green-900',
                isEmergency && 'text-red-700',
              )}
            />
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            {chat.caseNumber != undefined && chat.caseNumber !== '' && (
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold',
                  isEmergency ? 'bg-white text-red-700' : 'bg-chip text-green-900',
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
              {isOwnMessage && chat.lastMessage !== undefined && (
                <SentStatus status={chat.lastMessage.status} locale={locale} />
              )}
              {senderPrefix}
              {previewText}
            </p>
            {hasUnread && (
              <span
                className={cn(
                  'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white tabular-nums',
                  isEmergency ? 'bg-red-600' : 'bg-conveniat-green',
                )}
              >
                <span aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
                <span className="sr-only">
                  {unreadText(unreadCount, chat.isLarge === true, locale)}
                </span>
              </span>
            )}
          </div>
        </div>
      </ChatPreviewRow>
    </Link>
  );
};
