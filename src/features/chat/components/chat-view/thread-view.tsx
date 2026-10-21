'use client';

import { OfflineBanner } from '@/components/offline-banner';
import { ChatSelectionHeader } from '@/features/chat/components/chat-view/chat-selection-header';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ArrowLeft } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect } from 'react';

const threadTitle: StaticTranslationString = {
  de: 'Thread',
  en: 'Thread',
  fr: 'Fil de discussion',
};

const loadingThreadText: StaticTranslationString = {
  de: 'Thread wird geladen…',
  en: 'Loading thread…',
  fr: 'Chargement du fil…',
};

const threadFailedText: StaticTranslationString = {
  de: 'Der Thread konnte nicht geladen werden.',
  en: 'Failed to load thread.',
  fr: 'Impossible de charger le fil.',
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
  const chatId = useChatId();
  const { selectedMessage } = useChatActions();
  const trpcUtils = trpc.useUtils();

  // Fetch parent message directly
  const { data: parentMessage, isLoading: isLoadingParent } = trpc.chat.getMessage.useQuery({
    messageId: threadId,
  });

  const { mutate: markThreadAsRead } = trpc.chat.markThreadAsRead.useMutation({
    onMutate: () => {
      // 1. Optimistically update getMessage query for the thread message itself
      trpcUtils.chat.getMessage.setData({ messageId: threadId }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          hasUnreadReplies: false,
        };
      });

      // 2. Optimistically update infiniteMessages query for the chat
      trpcUtils.chat.infiniteMessages.setInfiniteData(
        { chatId, limit: CHAT_PAGE_SIZE, parentId: undefined },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.id === threadId) {
                  return { ...item, hasUnreadReplies: false };
                }
                return item;
              }),
            })),
          };
        },
      );
    },
    onSettled: () => {
      trpcUtils.chat.getMessage.invalidate({ messageId: threadId }).catch(console.error);
      trpcUtils.chat.infiniteMessages
        .invalidate({ chatId, limit: CHAT_PAGE_SIZE, parentId: undefined })
        .catch(console.error);
    },
  });

  useEffect(() => {
    if (chatId !== '' && threadId !== '') {
      markThreadAsRead({ chatId, threadId });
    }
  }, [chatId, threadId, markThreadAsRead]);

  return (
    <div className="bg-page flex h-full w-full flex-col">
      {/* Thread Header; a long-pressed reply gets its quote, thread and info actions here, the
          chat header being hidden under this overlay */}
      {selectedMessage === undefined ? (
        <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1">
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900"
            aria-label={backButtonLabel[locale]}
          >
            <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
          <span className="font-heading text-heading pl-1 text-[17px] font-bold">
            {threadTitle[locale]}
          </span>
        </div>
      ) : (
        <ChatSelectionHeader />
      )}
      <OfflineBanner locale={locale} />

      {/* Message List with Parent */}
      <div className="flex-1 overflow-hidden">
        {isLoadingParent && (
          <div className="flex h-full items-center justify-center text-[15px] text-green-700">
            {loadingThreadText[locale]}
          </div>
        )}
        {!isLoadingParent && !parentMessage && (
          <div className="flex h-full items-center justify-center text-[15px] text-green-700">
            {threadFailedText[locale]}
          </div>
        )}
        {!isLoadingParent && parentMessage && (
          <MessageList
            key={threadId}
            parentId={threadId}
            hideReplyCount
            isThread
            parentMessage={parentMessage}
          />
        )}
      </div>

      {/* Input */}
      <div className="border-line border-t bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* keyed: opening a thread from inside a thread must not carry over this draft */}
        <ChatTextAreaInput key={threadId} />
      </div>
    </div>
  );
};
