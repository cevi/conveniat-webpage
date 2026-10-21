'use client';

import { OfflineBanner } from '@/components/offline-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { ChatMessage } from '@/features/chat/api/types';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { ChatImage } from '@/features/chat/components/chat-view/message/chat-image';
import { extractMessageImages } from '@/features/chat/components/chat-view/message/utils/extract-message-images';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import { formatDayLabel } from '@/features/chat/utils/message-grouping';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, ChevronRight, MessageSquareOff } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect } from 'react';

const threadTitle: StaticTranslationString = {
  de: 'Thread',
  en: 'Thread',
  fr: 'Fil de discussion',
};

const inChatText: StaticTranslationString = {
  de: 'in {name}',
  en: 'in {name}',
  fr: 'dans {name}',
};

const youSuffixText: StaticTranslationString = {
  de: '(du)',
  en: '(you)',
  fr: '(toi)',
};

const showInChatText: StaticTranslationString = {
  de: 'Im Chat anzeigen',
  en: 'Show in chat',
  fr: 'Afficher dans le chat',
};

const threadFailedText: StaticTranslationString = {
  de: 'Der Thread konnte nicht geladen werden',
  en: 'The thread could not be loaded',
  fr: 'Impossible de charger le fil',
};

const backButtonLabel: StaticTranslationString = {
  de: 'Zurück',
  en: 'Back',
  fr: 'Retour',
};

/** The thread's message while it loads: the avatar, name and time, two lines of text. */
const ThreadRootSkeleton: React.FC = () => (
  <div aria-hidden="true">
    <div className="border-line border-b bg-white px-4 pt-4 pb-3">
      <div className="flex items-center gap-3">
        <div className="bg-quiet h-10 w-10 animate-pulse rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="bg-quiet h-4 w-28 animate-pulse rounded" />
          <div className="bg-quiet h-3 w-20 animate-pulse rounded" />
        </div>
      </div>
      <div className="bg-quiet mt-4 h-5 w-4/5 animate-pulse rounded" />
      <div className="bg-quiet mt-2 h-5 w-1/2 animate-pulse rounded" />
      <div className="bg-quiet mt-4 mb-2 h-4 w-32 animate-pulse rounded" />
    </div>
    <div className="px-4 pt-4">
      <div className="bg-quiet h-3 w-24 animate-pulse rounded" />
    </div>
    <div className="flex flex-col gap-3 px-2 py-4">
      {['w-56', 'w-44'].map((width) => (
        <div key={width} className="flex items-end gap-2 pl-2">
          <div className="bg-quiet h-8 w-8 animate-pulse rounded-full" />
          <div className={cn('bg-quiet h-14 animate-pulse rounded-[16px]', width)} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * The message a thread answers, pinned above its replies on white: who wrote it and when, the
 * text set larger than a bubble's, and the way back to it in the conversation.
 */
const ThreadRoot: React.FC<{
  message: ChatMessage;
  currentUserId: string | undefined;
  pictureUrl: string | undefined;
  participantName: string | undefined;
  locale: Locale;
  onShowInChat: (() => void) | undefined;
}> = ({ message, currentUserId, pictureUrl, participantName, locale, onShowInChat }) => {
  // `getMessage` leaves out the sender's name; the chat's members have it
  const senderName = message.senderName ?? participantName ?? '';
  const createdAt = new Date(message.createdAt);
  const images = extractMessageImages(message.messagePayload, locale);
  return (
    <article className="border-line border-b bg-white px-4 pt-4 pb-1">
      <div className="flex items-center gap-3">
        {typeof message.senderId === 'string' && (
          <PersonAvatar
            seed={message.senderId}
            name={senderName}
            pictureUrl={pictureUrl}
            className="h-10 w-10 text-sm"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] text-green-900">
            <span className="font-semibold">{splitDisplayName(senderName).primary}</span>
            {message.senderId === currentUserId && (
              <span className="text-green-700"> {youSuffixText[locale]}</span>
            )}
          </p>
          <p className="text-[13px] text-green-700">
            {formatDayLabel(createdAt, locale)}, {formatMessageTimeOnlyRaw(createdAt, locale)}
          </p>
        </div>
      </div>
      {images.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {images.map((image) => (
            <ChatImage key={image.url} url={image.url} alt={image.alt} caption={image.caption} />
          ))}
        </div>
      )}
      <div className="mt-3 text-[17px] leading-[25px] wrap-anywhere text-green-900">
        {formatMessageContent(message.messagePayload, locale)}
      </div>
      {onShowInChat === undefined ? (
        <div className="h-3" />
      ) : (
        <button
          type="button"
          onClick={onShowInChat}
          className="hover:bg-quiet -ml-2 flex min-h-11 cursor-pointer items-center gap-1 rounded-[12px] px-2 text-[13px] font-semibold text-green-900"
        >
          {showInChatText[locale]}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </article>
  );
};

interface ThreadViewProperties {
  threadId: string;
  onClose: () => void;
}

export const ThreadView: React.FC<ThreadViewProperties> = ({ threadId, onClose }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatId = useChatId();
  const { closeThread, scrollToMessage, threadHistory } = useChatActions();
  const { data: chatDetails } = useChatDetail(chatId);
  const { data: currentUserId } = trpc.chat.user.useQuery({});
  const trpcUtils = trpc.useUtils();

  // Fetch parent message directly
  const { data: parentMessage, isLoading: isLoadingParent } = trpc.chat.getMessage.useQuery({
    messageId: threadId,
  });
  const rootSender = chatDetails?.participants.find((p) => p.id === parentMessage?.senderId);

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
      <div className="border-line flex h-[60px] shrink-0 items-center gap-1 border-b bg-white pr-2 pl-1">
        <button
          type="button"
          onClick={onClose}
          className="hover:bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900"
          aria-label={backButtonLabel[locale]}
        >
          <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-col pl-1">
          <h1 className="font-heading text-heading text-[17px] leading-tight font-bold">
            {threadTitle[locale]}
          </h1>
          {chatDetails !== undefined && (
            <p className="mt-0.5 truncate text-[13px] text-green-700">
              {inChatText[locale].replace('{name}', chatDetails.name)}
            </p>
          )}
        </div>
      </div>
      <OfflineBanner locale={locale} />

      {/* Message List with Parent */}
      <div className="flex-1 overflow-hidden">
        {isLoadingParent && <ThreadRootSkeleton />}
        {!isLoadingParent && !parentMessage && (
          <div className="flex h-full items-center justify-center">
            <EmptyState icon={MessageSquareOff} title={threadFailedText[locale]} />
          </div>
        )}
        {!isLoadingParent && parentMessage && (
          <MessageList
            key={threadId}
            parentId={threadId}
            hideReplyCount
            isThread
            threadHeader={
              <ThreadRoot
                message={parentMessage}
                currentUserId={currentUserId}
                pictureUrl={rootSender?.pictureUrl}
                participantName={rootSender?.name}
                locale={locale}
                // a thread opened from a thread has its message in that thread, not the chat
                onShowInChat={
                  threadHistory.length === 1
                    ? (): void => {
                        closeThread();
                        // once the conversation is back under the closed overlay
                        setTimeout(() => scrollToMessage(threadId), 50);
                      }
                    : undefined
                }
              />
            }
          />
        )}
      </div>

      {/* Input */}
      <div className="border-line border-t bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* keyed: opening a thread from inside a thread must not carry over this draft */}
        <ChatTextAreaInput key={threadId} />
      </div>
    </div>
  );
};
