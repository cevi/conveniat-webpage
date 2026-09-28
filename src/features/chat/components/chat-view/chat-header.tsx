'use client';

import type React from 'react';

import { Button } from '@/components/ui/buttons/button';
import { ChatSelectionHeader } from '@/features/chat/components/chat-view/chat-selection-header';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
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

/**
 * The back arrow turns into a spinner until the overview has loaded, so a tap that takes a while,
 * as it does offline, is not mistaken for one that did nothing.
 */
const BackIcon: React.FC = () => {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
  ) : (
    <ArrowLeft className="h-5 w-5 text-gray-700" />
  );
};

export const ChatHeaderSkeleton: React.FC = () => (
  <div className="flex h-[60px] items-center justify-between border-b-2 border-gray-200 bg-white px-4">
    <Link href="/app/chat">
      <Button variant="ghost" size="icon" className="mr-1 hover:bg-gray-100">
        <BackIcon />
      </Button>
    </Link>
    <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
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
    <>
      <div className="flex h-[60px] items-center justify-between border-b-2 border-gray-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/app/chat">
            <Button variant="ghost" size="icon" className="mr-1 hover:bg-gray-100">
              <BackIcon />
            </Button>
          </Link>

          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-heading truncate text-lg leading-tight font-bold text-gray-900">
                {chatDetails.name}
              </h1>
              {chatDetails.caseNumber != undefined && chatDetails.caseNumber !== '' && (
                <span className="shrink-0 rounded bg-red-100 px-2 py-0.5 font-mono text-xs font-bold text-red-700">
                  {chatDetails.caseNumber}
                </span>
              )}
            </div>
            {isOneToOne && isPartnerOnline && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                <p className="font-body text-[11px] font-medium tracking-tight text-green-600">
                  {onlineText[locale]}
                </p>
              </div>
            )}
            {isGroupChat && (
              <p className="font-body mt-0.5 text-[11px] font-medium tracking-wider text-gray-500 uppercase">
                {chatDetails.participants.length} {participantsText[locale]}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <Link href={`/app/chat/${chatId}/details`}>
            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
              <Info className="h-5 w-5 text-gray-700" />
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};
