'use client';

import { Button } from '@/components/ui/buttons/button';
import { MessageInfoDropdown } from '@/features/chat/components/chat-view/message/message-info-dropdown';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { ChatCapability } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Info, MessageSquare, Quote, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const quoteText: StaticTranslationString = {
  de: 'Zitieren',
  en: 'Quote',
  fr: 'Citer',
};

const replyInThreadText: StaticTranslationString = {
  de: 'Im Thread antworten',
  en: 'Reply in thread',
  fr: 'Répondre dans le fil',
};

const messageInfoText: StaticTranslationString = {
  de: 'Nachrichteninfo',
  en: 'Message info',
  fr: 'Infos message',
};

export const ChatSelectionHeader: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { selectedMessage, setSelectedMessage, quoteMessage, replyInThread } = useChatActions();
  const [showInfo, setShowInfo] = React.useState(false);
  const { data: currentUserId } = trpc.chat.user.useQuery({});

  const chatId = useChatId();
  const { data: chatDetails } = trpc.chat.chatDetails.useQuery({ chatId });

  if (!selectedMessage) return;

  const handleCancelSelection = (): void => {
    setSelectedMessage(undefined);
  };

  const handleQuote = (): void => {
    quoteMessage(selectedMessage.id);
    setSelectedMessage(undefined);
  };

  const handleThread = (): void => {
    replyInThread(selectedMessage.id);
    setSelectedMessage(undefined);
  };

  const canThread = chatDetails?.capabilities.includes(ChatCapability.THREADS) ?? false;

  return (
    <div className="animate-in slide-in-from-top flex h-[60px] items-center justify-between border-b-2 border-gray-200 bg-white px-4 duration-200">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancelSelection}
          className="hover:bg-gray-100"
        >
          <X className="h-5 w-5 text-gray-700" />
        </Button>
        <span className="text-lg font-bold text-gray-900">1</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleQuote}
          title={quoteText[locale]}
          className="hover:bg-gray-100"
        >
          <Quote className="h-5 w-5 text-gray-700" />
        </Button>
        {canThread && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThread}
            title={replyInThreadText[locale]}
            className="hover:bg-gray-100"
          >
            <MessageSquare className="h-5 w-5 text-gray-700" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInfo(true)}
          title={messageInfoText[locale]}
          className="hover:bg-gray-100"
        >
          <Info className="h-5 w-5 text-gray-700" />
        </Button>
      </div>

      {showInfo && (
        <MessageInfoDropdown
          message={selectedMessage}
          isCurrentUser={selectedMessage.senderId === currentUserId}
          onClose={() => {
            setShowInfo(false);
            setSelectedMessage(undefined);
          }}
        />
      )}
    </div>
  );
};
