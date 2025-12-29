'use client';

import { Button } from '@/components/ui/buttons/button';
import type { ChatMessage } from '@/features/chat/api/types';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ArrowLeft } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const threadTitle: StaticTranslationString = {
  de: 'Thread',
  en: 'Thread',
  fr: 'Fil de discussion',
};

const backButtonLabel: StaticTranslationString = {
  de: 'Zurück',
  en: 'Back',
  fr: 'Retour',
};

interface ThreadViewProperties {
  threadId: string;
  onClose: () => void;
}

export const ThreadView: React.FC<ThreadViewProperties> = ({ threadId, onClose }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  // Fetch parent message directly
  const { data: parentMessage, isLoading: isLoadingParent } = trpc.chat.getMessage.useQuery({
    messageId: threadId,
  });

  return (
    <div className="flex h-full w-full flex-col bg-gray-50">
      {/* Thread Header */}
      <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="-ml-2 h-8 w-8 text-gray-500 hover:text-gray-700"
          aria-label={backButtonLabel[locale]}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-gray-800">{threadTitle[locale]}</span>
      </div>

      {/* Message List with Parent */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingParent && (
          <div className="flex h-full items-center justify-center text-gray-400">
            Loading thread...
          </div>
        )}
        {!isLoadingParent && !parentMessage && (
          <div className="flex h-full items-center justify-center text-red-500">
            Failed to load thread.
          </div>
        )}
        {!isLoadingParent && parentMessage && (
          <MessageList
            parentId={threadId}
            hideReplyCount
            isThread
            parentMessage={parentMessage as ChatMessage}
          />
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-2">
        <ChatTextAreaInput />
      </div>
    </div>
  );
};
