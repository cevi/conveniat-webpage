'use client';
import { AppFooterController } from '@/components/footer/hide-footer-context';
import { OfflineBanner } from '@/components/offline-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ChatHeader, ChatHeaderSkeleton } from '@/features/chat/components/chat-view/chat-header';
import { ChatSkeleton } from '@/features/chat/components/chat-view/chat-skeleton';
import { ChatTextAreaInput } from '@/features/chat/components/chat-view/chat-text-area-input';
import { MessageList } from '@/features/chat/components/chat-view/message-list';
import { ThreadView } from '@/features/chat/components/chat-view/thread-view';
import { RealtimeSyncBanner } from '@/features/chat/components/realtime-sync-banner';
import { ChatActionsProvider, useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatSSE } from '@/features/chat/hooks/use-chat-sse';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { fitToVisualViewport } from '@/features/chat/utils/fit-to-visual-viewport';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, UserX, WifiOff } from 'lucide-react';
import React from 'react';

const yourOffline: StaticTranslationString = {
  en: 'You are offline',
  de: 'Du bist offline',
  fr: 'Tu es hors ligne',
};

const youMustBeOnline: StaticTranslationString = {
  en: 'You need to be online to see this chat.',
  de: 'Du musst online sein, um diesen Chat zu sehen.',
  fr: 'Tu dois être en ligne pour voir ce chat.',
};

const errorLoadingChat: StaticTranslationString = {
  en: 'The chat could not be loaded',
  de: 'Der Chat konnte nicht geladen werden',
  fr: 'Le chat n’a pas pu être chargé',
};

const tryAgainLater: StaticTranslationString = {
  en: 'Please try again later.',
  de: 'Bitte versuche es später noch einmal.',
  fr: 'Réessaie plus tard.',
};

const noLongerMember: StaticTranslationString = {
  en: 'You are no longer in this chat',
  de: 'Du bist nicht mehr in diesem Chat',
  fr: 'Tu ne fais plus partie de ce chat',
};

/**
 * What the chat screen shows instead of a conversation it cannot show: offline without a cached
 * copy, a failed load, or a chat the user has left. The header keeps the way back to the list.
 */
const ChatUnavailable: React.FC<{ icon: LucideIcon; title: string; description?: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="bg-page fixed top-(--preview-banner-height) z-[110] flex h-[calc(100dvh-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]">
    <ChatHeaderSkeleton />
    <div className="flex flex-1 items-center justify-center">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  </div>
);

const ChatClientContent: React.FC = () => {
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const {
    data: chatDetails,
    isLoading,
    isPaused,
    isPending,
    isError,
    error,
    errorUpdateCount,
  } = useChatDetail(chatId);
  const { activeThreadId, closeThread } = useChatActions();

  const { status: realtimeStatus, reconnect: reconnectRealtime } = useChatSSE(
    chatId === '' ? [] : [chatId],
  );

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (isLoading && errorUpdateCount === 0 && chatDetails === undefined) return <ChatSkeleton />;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (isPaused && isPending && chatDetails === undefined) {
    return (
      <ChatUnavailable
        icon={WifiOff}
        title={yourOffline[locale]}
        description={youMustBeOnline[locale]}
      />
    );
  }

  // Cached details mean the user could read this chat before; NOT_FOUND now means they left
  // or were removed. Without a cache it may just as well be a chat that never existed.
  if (error?.data?.code === 'NOT_FOUND' && chatDetails !== undefined)
    return <ChatUnavailable icon={UserX} title={noLongerMember[locale]} />;

  if ((isError || (isLoading && errorUpdateCount !== 0)) && chatDetails === undefined)
    return (
      <ChatUnavailable
        icon={AlertCircle}
        title={errorLoadingChat[locale]}
        description={tryAgainLater[locale]}
      />
    );

  return (
    <div
      ref={fitToVisualViewport}
      className="bg-page fixed top-[calc(var(--visual-viewport-top,0px)+var(--preview-banner-height))] z-[110] flex h-[calc(var(--visual-viewport-height,100dvh)-var(--preview-banner-height))] w-screen flex-col overflow-y-hidden xl:top-(--app-content-top) xl:left-(--app-content-left) xl:z-0 xl:h-[calc(100dvh-var(--app-content-top))] xl:w-[calc(100dvw-var(--app-content-left))]"
    >
      <AppFooterController hideAppFooter />
      <ChatHeader />
      {/* the chat covers the app shell and its banner on phones */}
      <OfflineBanner locale={locale} />
      <RealtimeSyncBanner status={realtimeStatus} onReconnect={reconnectRealtime} />
      <div className="flex-1 overflow-hidden">
        <MessageList />
      </div>
      <div className="border-line border-t bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <ChatTextAreaInput />
      </div>

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
  return (
    <ChatActionsProvider>
      <ChatClientContent />
    </ChatActionsProvider>
  );
};
