'use client';

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

const cancelSelectionText: StaticTranslationString = {
  de: 'Auswahl aufheben',
  en: 'Cancel selection',
  fr: 'Annuler la sélection',
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

  const buttonClassName =
    'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900 hover:bg-quiet';

  return (
    <div className="animate-in slide-in-from-top border-line flex h-[60px] shrink-0 items-center justify-between border-b bg-white pr-2 pl-1 duration-200">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancelSelection}
          aria-label={cancelSelectionText[locale]}
          className={buttonClassName}
        >
          <X className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span className="font-heading text-heading text-lg font-bold">1</span>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={handleQuote}
          aria-label={quoteText[locale]}
          title={quoteText[locale]}
          className={buttonClassName}
        >
          <Quote className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        {canThread && (
          <button
            type="button"
            onClick={handleThread}
            aria-label={replyInThreadText[locale]}
            title={replyInThreadText[locale]}
            className={buttonClassName}
          >
            <MessageSquare className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label={messageInfoText[locale]}
          title={messageInfoText[locale]}
          className={buttonClassName}
        >
          <Info className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
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
