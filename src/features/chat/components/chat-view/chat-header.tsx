'use client';

import type React from 'react';

import { ChatSelectionHeader } from '@/features/chat/components/chat-view/chat-selection-header';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link, { useLinkStatus } from 'next/link';

const onlineText: StaticTranslationString = {
  de: 'Online',
  en: 'Online',
  fr: 'En ligne',
};

const participantsText: StaticTranslationString = {
  de: 'Teilnehmer',
  en: 'participants',
  fr: 'participants',
};

const backText: StaticTranslationString = {
  de: 'Zurück zu den Chats',
  en: 'Back to chats',
  fr: 'Retour aux discussions',
};

const detailsText: StaticTranslationString = {
  de: 'Chat-Details',
  en: 'Chat details',
  fr: 'Détails du chat',
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

/** The header while the chat loads: the name and the line under it, the details button. */
export const ChatHeaderSkeleton: React.FC = () => (
  <div className={headerClassName}>
    <BackLink />
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pl-1">
      <div className="bg-quiet h-[18px] w-40 animate-pulse rounded" />
      <div className="bg-quiet h-3 w-20 animate-pulse rounded" />
    </div>
    <div className={iconButtonClassName}>
      <div className="bg-quiet h-[22px] w-[22px] animate-pulse rounded-full" />
    </div>
  </div>
);

export const ChatHeader: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { data: user } = trpc.chat.user.useQuery({});
  const { data: chatDetails } = trpc.chat.chatDetails.useQuery({ chatId });
  const { selectedMessage } = useChatActions();
  const isOnline = useOnlineStatus();

  if (!chatDetails) {
    return <ChatHeaderSkeleton />;
  }

  // Only a partner who is online is shown, as a label saying "Offline" read as if it were about
  // the user, and while the user is offline the presence it would show is stale.
  const isPartnerOnline =
    isOnline && chatDetails.participants.some((p) => p.id !== user && p.isOnline);
  const isOneToOne = chatDetails.type === 'ONE_TO_ONE';
  const isGroupChat = chatDetails.type === 'GROUP';

  if (selectedMessage) {
    return <ChatSelectionHeader />;
  }

  return (
    <div className={headerClassName}>
      <BackLink />

      <div className="flex min-w-0 flex-1 flex-col pl-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="font-heading text-heading truncate text-[17px] leading-tight font-bold">
            {chatDetails.name}
          </h1>
          {chatDetails.caseNumber != undefined && chatDetails.caseNumber !== '' && (
            <span
              className={cn(
                'shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold',
                chatDetails.type === 'EMERGENCY'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-chip text-green-900',
              )}
            >
              {chatDetails.caseNumber}
            </span>
          )}
        </div>
        {isOneToOne && isPartnerOnline && (
          <p className="text-conveniat-green mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
            <span className="bg-conveniat-green h-1.5 w-1.5 rounded-full" aria-hidden="true" />
            {onlineText[locale]}
          </p>
        )}
        {isGroupChat && (
          <p className="mt-0.5 text-xs text-green-700">
            {chatDetails.participants.length} {participantsText[locale]}
          </p>
        )}
      </div>

      <Link
        href={`/app/chat/${chatId}/details`}
        aria-label={detailsText[locale]}
        className={iconButtonClassName}
      >
        <Info className="h-[22px] w-[22px]" aria-hidden="true" />
      </Link>
    </div>
  );
};
