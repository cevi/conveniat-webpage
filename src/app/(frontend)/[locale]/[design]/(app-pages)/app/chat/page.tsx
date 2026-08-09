import { AppAdvertisement } from '@/components/app-advertisement';
import { ChatQrCodeButton } from '@/features/chat/components/chat-overview-view/chat-qr-code-button';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
import { QrCodeIconSkeleton } from '@/features/chat/components/qr-server-component';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import type React from 'react';
import { Suspense } from 'react';

/**
 * Chat overview.
 *
 * The page shell is kept static: the chat list is rendered by a client
 * component backed by the persisted (IndexedDB) react-query cache, so
 * navigating to /app/chat immediately shows the previously loaded chats -
 * also while offline - instead of the loading skeleton, and the list is
 * refreshed in the background.
 *
 * Everything that needs the session (the QR invite button) is streamed inside
 * its own Suspense boundary so it cannot turn the whole segment dynamic.
 */
const ChatPage: React.FC<{
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}> = async ({ params }) => {
  const { locale, design } = await params;

  const qrCodeButton = (
    <Suspense fallback={<QrCodeIconSkeleton />}>
      <ChatQrCodeButton />
    </Suspense>
  );

  return (
    <>
      <article className="container mx-auto mt-8 mb-20 px-3 py-6 sm:px-6 md:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <ChatsOverviewClientComponent qrCodeButton={qrCodeButton} />
        </div>
      </article>
      {design !== DesignCodes.APP_DESIGN && <AppAdvertisement locale={locale} type="chat" />}
    </>
  );
};

export default ChatPage;
