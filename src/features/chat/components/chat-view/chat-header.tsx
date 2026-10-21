'use client';

import type React from 'react';

import { IconTile } from '@/components/ui/icon-tile';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { ChatDetails } from '@/features/chat/api/types';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ChatType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, Loader2, Megaphone } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
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

const stackedAvatarClassName = 'h-8 w-8 text-[11px] ring-2 ring-white';

/**
 * Who the chat is with: the other person of a private chat, the first two others of a group,
 * one over the other, and the megaphone of an announcement channel, where the members are not
 * listed.
 */
const ChatAvatar: React.FC<{ chat: ChatDetails; currentUser: string | undefined }> = ({
  chat,
  currentUser,
}) => {
  if (chat.type === ChatType.ANNOUNCEMENT) return <IconTile icon={Megaphone} />;
  const others = chat.participants.filter((participant) => participant.id !== currentUser);
  const [first, second] = others;
  if (first === undefined) return <></>;
  if (chat.type === ChatType.ONE_TO_ONE || second === undefined) {
    return (
      <PersonAvatar
        seed={first.id}
        name={first.name}
        pictureUrl={first.pictureUrl}
        className="h-10 w-10 text-sm"
      />
    );
  }
  return (
    <span className="relative h-11 w-12 shrink-0" aria-hidden="true">
      <PersonAvatar
        seed={first.id}
        name={first.name}
        pictureUrl={first.pictureUrl}
        className={cn(stackedAvatarClassName, 'absolute top-0 left-0')}
      />
      <PersonAvatar
        seed={second.id}
        name={second.name}
        pictureUrl={second.pictureUrl}
        className={cn(stackedAvatarClassName, 'absolute right-0 bottom-0')}
      />
    </span>
  );
};

export const ChatHeader: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { data: user } = trpc.chat.user.useQuery({});
  const { data: chatDetails } = trpc.chat.chatDetails.useQuery({ chatId });
  const isOnline = useOnlineStatus();

  if (!chatDetails) {
    return <ChatHeaderSkeleton />;
  }

  // Only a partner who is online is shown, as a label saying "Offline" read as if it were about
  // the user, and while the user is offline the presence it would show is stale.
  const isPartnerOnline =
    isOnline && chatDetails.participants.some((p) => p.id !== user && p.isOnline);
  const isOneToOne = chatDetails.type === ChatType.ONE_TO_ONE;
  const isAnnouncement = chatDetails.type === ChatType.ANNOUNCEMENT;

  let subtitle: React.ReactNode;
  if (isOneToOne) {
    subtitle = isPartnerOnline && (
      <span className="text-conveniat-green flex items-center gap-1.5 font-semibold">
        <span className="bg-conveniat-green h-1.5 w-1.5 rounded-full" aria-hidden="true" />
        {onlineText[locale]}
      </span>
    );
  } else if (!isAnnouncement) {
    subtitle = describeMembers(
      chatDetails.participants
        .filter((participant) => participant.id !== user)
        .map((participant) => splitDisplayName(participant.name).primary),
      locale,
    );
  }

  return (
    <div className={headerClassName}>
      <BackLink />

      {/* the whole of who the chat is with leads to its details */}
      <Link
        href={`/app/chat/${chatId}/details`}
        aria-label={`${chatDetails.name}, ${openDetailsText[locale]}`}
        className="hover:bg-quiet flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[12px] py-1 pr-2 pl-1"
      >
        <ChatAvatar chat={chatDetails} currentUser={user} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-heading text-heading truncate text-[17px] leading-tight font-bold">
              {chatDetails.name}
            </span>
            {chatDetails.caseNumber != undefined && chatDetails.caseNumber !== '' && (
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold',
                  chatDetails.type === ChatType.EMERGENCY
                    ? 'bg-red-50 text-red-700'
                    : 'bg-chip text-green-900',
                )}
              >
                {chatDetails.caseNumber}
              </span>
            )}
          </span>
          {subtitle !== undefined && subtitle !== false && subtitle !== '' && (
            <span className="mt-0.5 truncate text-[13px] text-green-700">{subtitle}</span>
          )}
        </span>
      </Link>
    </div>
  );
};
