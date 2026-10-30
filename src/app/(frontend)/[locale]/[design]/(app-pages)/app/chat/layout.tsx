import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import {
  ChatQrCodeButton,
  QrCodeIconSkeleton,
} from '@/features/chat/components/chat-overview-view/chat-qr-code-button';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import { ChatSplitView } from '@/features/chat/components/chat-split-view';
import { SetOnlineStatus } from '@/features/chat/components/set-online-status';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { ReactNode } from 'react';
import React, { Suspense } from 'react';

interface LayoutProperties {
  children: ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}

const chatsTitle: StaticTranslationString = {
  de: 'Chats',
  en: 'Chats',
  fr: 'Conversations',
};

/**
 * The chat list lives here rather than on the overview page, so a desktop keeps it beside the
 * open chat. It is rendered by a client component backed by the persisted (IndexedDB)
 * react-query cache, so the list shows the previously loaded chats right away, also offline.
 *
 * Everything that needs the session (the QR invite button) is streamed inside its own Suspense
 * boundary so it cannot turn the whole segment dynamic.
 */
const Layout: React.FC<LayoutProperties> = async ({ children, params }) => {
  const { locale } = await params;

  const qrCodeButton = (
    <Suspense fallback={<QrCodeIconSkeleton />}>
      <ChatQrCodeButton />
    </Suspense>
  );

  return (
    <>
      <SetOnlineStatus />
      <SetDynamicPageTitle newTitle={chatsTitle[locale]} />
      <ChatSplitView list={<ChatsOverviewClientComponent qrCodeButton={qrCodeButton} />}>
        {children}
      </ChatSplitView>
    </>
  );
};

export default Layout;
