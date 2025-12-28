'use client';

import type React from 'react';

import { Button } from '@/components/ui/buttons/button';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, Info } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';

const onlineText: StaticTranslationString = {
  de: 'Online',
  en: 'Online',
  fr: 'En ligne',
};

const offlineText: StaticTranslationString = {
  de: 'Offline',
  en: 'Offline',
  fr: 'Hors ligne',
};

const participantsText: StaticTranslationString = {
  de: 'Teilnehmer',
  en: 'participants',
  fr: 'participants',
};

export const ChatHeaderSkeleton: React.FC = () => (
  <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
    <Link href="/app/chat">
      <Button variant="ghost" size="icon" className="mr-1 hover:bg-gray-100">
        <ArrowLeft className="h-5 w-5 text-gray-700" />
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

  if (!chatDetails) {
    return <ChatHeaderSkeleton />;
  }

  // Find the first online participant for status display
  const onlineParticipant = chatDetails.participants
    .filter((p) => p.id !== user) // Exclude the current user
    .find((p) => p.isOnline);
  const isOneToOne = chatDetails.type === 'ONE_TO_ONE';
  const isGroupChat = chatDetails.type === 'GROUP';

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/app/chat">
            <Button variant="ghost" size="icon" className="mr-1 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
          </Link>

          <div className="flex min-w-0 flex-col">
            <h1 className="font-heading truncate text-lg leading-tight font-bold text-gray-900">
              {chatDetails.name}
            </h1>
            {isOneToOne && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    onlineParticipant
                      ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
                      : 'bg-gray-300',
                  )}
                />
                <p
                  className={cn(
                    'font-body text-[11px] font-medium tracking-tight',
                    onlineParticipant ? 'text-green-600' : 'text-gray-400',
                  )}
                >
                  {onlineParticipant ? onlineText[locale] : offlineText[locale]}
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
