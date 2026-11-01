'use client';

import type React from 'react';

import type { ChatDetails } from '@/features/chat/api/types';
import type { ChatAvatarChat } from '@/features/chat/components/ui/chat-avatar';
import { ChatAvatar } from '@/features/chat/components/ui/chat-avatar';
import { useChatId } from '@/features/chat/context/chat-id-context';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ChatType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link, { useLinkStatus } from 'next/link';

const onlineText: StaticTranslationString = {
  de: 'Online',
  en: 'Online',
  fr: 'En ligne',
};

const backText: StaticTranslationString = {
  de: 'Zurück zu den Chats',
  en: 'Back to chats',
  fr: 'Retour aux discussions',
};

const openDetailsText: StaticTranslationString = {
  de: 'Chat-Details öffnen',
  en: 'Open chat details',
  fr: 'Ouvrir les détails du chat',
};

/** How many names the subtitle spells out before it counts the rest. */
const NAMED_MEMBERS = 2;

/**
 * "John, Samantha und du", or "John, Samantha und 5 weitere" in a bigger group: the people of
 * the chat by their Ceviname, as they know each other at camp.
 */
export const describeMembers = (names: string[], locale: Locale): string => {
  const named = names.slice(0, NAMED_MEMBERS).join(', ');
  const rest = names.length - NAMED_MEMBERS;
  if (rest > 0) {
    if (locale === 'de') return `${named} und ${rest} weitere`;
    if (locale === 'fr') return `${named} et ${rest} autres`;
    return `${named} and ${rest} more`;
  }
  if (named === '') return '';
  if (locale === 'de') return `${named} und du`;
  if (locale === 'fr') return `${named} et toi`;
  return `${named} and you`;
};

const headerClassName =
  'border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1';
const iconButtonClassName =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-green-900 hover:bg-quiet';

/**
 * The back arrow turns into a spinner until the overview has loaded, so a tap that takes a while,
 * as it does offline, is not mistaken for one that did nothing.
 */
const BackIcon: React.FC = () => {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className="h-[22px] w-[22px] animate-spin" aria-hidden="true" />
  ) : (
    <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
  );
};

const BackLink: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <Link href="/app/chat" aria-label={backText[locale]} className={iconButtonClassName}>
      <BackIcon />
    </Link>
  );
};

/** The header while the chat loads: the avatars, the name and the line under it. */
export const ChatHeaderSkeleton: React.FC = () => (
  <div className={headerClassName}>
    <BackLink />
    <div className="bg-quiet h-10 w-10 shrink-0 animate-pulse rounded-full" />
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pl-2">
      <div className="bg-quiet h-[18px] w-40 animate-pulse rounded" />
      <div className="bg-quiet h-3 w-28 animate-pulse rounded" />
    </div>
  </div>
);

/** Who the chat is with, as far as its header shows it. */
type HeaderChat = ChatAvatarChat & Pick<ChatWithMessagePreview, 'caseNumber'>;

/**
 * The chat for the header: from its details once they are there, before that from the chat
 * list, which the phone keeps, so a chat tapped in the list opens with its name and picture
 * instead of a skeleton. Both give the same values, so nothing changes when the details land.
 */
const useHeaderChat = (
  chatId: string,
  chatDetails: ChatDetails | undefined,
  currentUser: string | undefined,
): HeaderChat | undefined => {
  // only reads what the list loaded; a chat opened from a push has no list entry yet
  const { data: listEntry } = trpc.chat.chats.useQuery(
    {},
    { enabled: false, select: (chats) => chats.find((chat) => chat.id === chatId) },
  );

  if (chatDetails === undefined) return listEntry;

  const chatType = chatDetails.type as ChatType;
  const partner =
    chatType === ChatType.ONE_TO_ONE
      ? chatDetails.participants.find((participant) => participant.id !== currentUser)
      : undefined;
  return {
    id: chatId,
    name: chatDetails.name,
    chatType,
    caseNumber: chatDetails.caseNumber,
    partner:
      partner === undefined ? undefined : { userId: partner.id, pictureUrl: partner.pictureUrl },
  };
};

export const ChatHeader: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { data: user } = trpc.chat.user.useQuery({});
  const { data: chatDetails } = trpc.chat.chatDetails.useQuery({ chatId });
  const isOnline = useOnlineStatus();
  const chat = useHeaderChat(chatId, chatDetails, user);

  if (chat === undefined) {
    return <ChatHeaderSkeleton />;
  }

  const isOneToOne = chat.chatType === ChatType.ONE_TO_ONE;
  // the line under the name of a group lists its members; it keeps its room while they load
  const hasMemberLine = !isOneToOne && chat.chatType !== ChatType.ANNOUNCEMENT;

  let subtitle: React.ReactNode;
  if (chatDetails !== undefined && isOneToOne) {
    // Only a partner who is online is shown, as a label saying "Offline" read as if it were
    // about the user, and while the user is offline the presence it would show is stale.
    const isPartnerOnline =
      isOnline && chatDetails.participants.some((p) => p.id !== user && p.isOnline);
    subtitle = isPartnerOnline && (
      <span className="text-conveniat-green flex items-center gap-1.5 font-semibold">
        <span className="bg-conveniat-green h-1.5 w-1.5 rounded-full" aria-hidden="true" />
        {onlineText[locale]}
      </span>
    );
  } else if (chatDetails !== undefined && hasMemberLine) {
    subtitle = describeMembers(
      chatDetails.participants
        .filter((participant) => participant.id !== user)
        .map((participant) => splitDisplayName(participant.name).primary),
      locale,
    );
  }
  const hasSubtitle = subtitle !== undefined && subtitle !== false && subtitle !== '';

  return (
    <div className={headerClassName}>
      <BackLink />

      {/* the whole of who the chat is with leads to its details */}
      <Link
        href={`/app/chat/${chatId}/details`}
        aria-label={`${chat.name}, ${openDetailsText[locale]}`}
        className="hover:bg-quiet flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[12px] py-1 pr-2 pl-1"
      >
        <ChatAvatar chat={chat} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-heading text-heading truncate text-[17px] leading-tight font-bold">
              {chat.name}
            </span>
            {chat.caseNumber != undefined && chat.caseNumber !== '' && (
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold',
                  chat.chatType === ChatType.EMERGENCY
                    ? 'bg-red-50 text-red-700'
                    : 'bg-chip text-green-900',
                )}
              >
                {chat.caseNumber}
              </span>
            )}
          </span>
          {(hasSubtitle || hasMemberLine) && (
            <span className="mt-0.5 h-[18px] truncate text-[13px] leading-[18px] text-green-700">
              {hasSubtitle && (
                <span className="transition-opacity duration-300 starting:opacity-0">
                  {subtitle}
                </span>
              )}
            </span>
          )}
        </span>
      </Link>
    </div>
  );
};
