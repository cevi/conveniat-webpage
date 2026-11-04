'use client';
import { AppFooterController } from '@/components/footer/hide-footer-context';
import { OfflineBanner } from '@/components/offline-banner';
import { ChatHeader, ChatHeaderSkeleton } from '@/features/chat/components/chat-view/chat-header';
import { ChatSkeleton } from '@/features/chat/components/chat-view/chat-skeleton';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { PhonePushHint } from '@/features/chat/components/chat-view/phone-push-hint';
import { ThreadView } from '@/features/chat/components/chat-view/thread-view';
import { RealtimeSyncBanner } from '@/features/chat/components/realtime-sync-banner';
import {
  chatErrorTitleText,
  chatOfflineDescriptionText,
  QueryUnavailable,
} from '@/features/chat/components/ui/query-unavailable';
import { ChatActionsProvider, useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { queryAvailability } from '@/features/chat/utils/query-availability';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { fitToVisualViewport } from '@/utils/fit-to-visual-viewport';
import React from 'react';

/** The chat screen where it does not follow the keyboard: over the app shell on a phone. */
export const chatScreenClassName =
  'bg-page fixed top-(--app-top-inset) z-[110] flex h-[calc(100dvh-var(--app-top-inset))] w-screen flex-col overflow-y-hidden xl:absolute xl:inset-0 xl:z-0 xl:h-auto xl:w-auto';

/** The bar under the messages, holding the composer or why there is none. */
export const ChatComposerBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-line border-t bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
    {children}
  </div>
);

/**
 * The chat screen while it has no conversation to show. The header keeps the way back to the
 * list.
 */
const ChatUnavailable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={chatScreenClassName}>
    <ChatHeaderSkeleton />
    <div className="flex flex-1 items-center justify-center">{children}</div>
  </div>
);

const ChatClientContent: React.FC = () => {
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const chatDetailQuery = useChatDetail(chatId);
  const availability = queryAvailability(chatDetailQuery);
  const { activeThreadId, closeThread } = useChatActions();

  const { status: realtimeStatus, reconnect: reconnectRealtime } = useChatSSE(
    chatId === '' ? [] : [chatId],
  );

  if (availability === 'loading') return <ChatSkeleton header={<ChatHeader />} />;
  if (availability !== 'ready') {
    return (
      <ChatUnavailable>
        <QueryUnavailable
          availability={availability}
          offlineDescription={chatOfflineDescriptionText[locale]}
          errorTitle={chatErrorTitleText[locale]}
          onRetry={() => void chatDetailQuery.refetch()}
          isRetrying={chatDetailQuery.isFetching}
          locale={locale}
        />
      </ChatUnavailable>
    );
  }

  return (
    <div
      ref={fitToVisualViewport}
      className="bg-page fixed top-[calc(var(--visual-viewport-top,0px)+var(--app-top-inset))] z-[110] flex h-[calc(var(--visual-viewport-height,100dvh)-var(--app-top-inset))] w-screen flex-col overflow-y-hidden xl:absolute xl:inset-0 xl:z-0 xl:h-auto xl:w-auto"
    >
      <AppFooterController hideAppFooter />
      <ChatHeader />
      {/* the chat covers the app shell and its banner on phones */}
      <OfflineBanner locale={locale} />
      <RealtimeSyncBanner status={realtimeStatus} onReconnect={reconnectRealtime} />
      <div className="flex-1 overflow-hidden">
        <MessageList />
      </div>
      <PhonePushHint chatId={chatId} />
      <ChatComposerBar>
        <ChatTextAreaInput />
      </ChatComposerBar>

      {/* Thread View Overlay */}
      {typeof activeThreadId === 'string' && activeThreadId.length > 0 && (
        <div className="bg-page absolute inset-0 z-[110]">
          <ThreadView threadId={activeThreadId} onClose={() => closeThread()} />
        </div>
      )}
    </div>
  );
};

export const ChatClientComponent: React.FC = () => {
  // A chat being opened beside this one shows here before the router remounts the route, so the
  // key gives each chat a fresh screen: its own scroll, draft and open thread.
  const chatId = useChatId();
  return (
    <ChatActionsProvider key={chatId}>
      <ChatClientContent />
    </ChatActionsProvider>
  );
};
