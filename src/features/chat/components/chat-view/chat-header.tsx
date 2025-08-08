'use client';

import type React from 'react';

import { Button } from '@/components/ui/buttons/button';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ArrowLeft, Info } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';

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
  const { data: user } = useChatUser();
  const { data: chatDetails } = useChatDetail(chatId);

  if (!chatDetails) {
    return <ChatHeaderSkeleton />;
  }

  // Find the first online participant for status display
  const onlineParticipant = chatDetails.participants
    .filter((p) => p.id !== user) // Exclude the current user
    .find((p) => p.isOnline);
  const isGroupChat = chatDetails.participants.length > 2;

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/app/chat">
            <Button variant="ghost" size="icon" className="mr-1 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
          </Link>

          <div>
            <h1 className="font-heading text-lg font-semibold text-gray-900">{chatDetails.name}</h1>
            {!isGroupChat && onlineParticipant && (
              <p className="font-body text-xs text-green-600">{onlineText[locale]}</p>
            )}
            {isGroupChat && (
              <p className="font-body text-xs text-gray-500">
                {chatDetails.participants.length} {participantsText[locale]}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <Link href={`/app/chat/${chatId}/details`} className="hover:bg-gray-100">
            <Info className="h-5 w-5 text-gray-700" />
          </Link>
        </div>
      </div>
    </>
  );
};
