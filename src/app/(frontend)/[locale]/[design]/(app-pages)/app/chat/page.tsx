import { AppAdvertisement } from '@/components/app-advertisement';
import {
  ChatQrCodeButton,
  QrCodeIconSkeleton,
} from '@/features/chat/components/chat-overview-view/chat-qr-code-button';
import { ChatsOverviewClientComponent } from '@/features/chat/components/chat-overview-view/chats-overview-client-component';
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
      {/* white like the design, so the grey search contrasts; the bottom room keeps the last row
          clear of the tab bar and the "Neuer Chat" button */}
      <article className="container mx-auto min-h-full bg-white px-4 pt-4 pb-[168px] sm:px-6 md:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <ChatsOverviewClientComponent qrCodeButton={qrCodeButton} />
        </div>
      </article>
      {design !== DesignCodes.APP_DESIGN && <AppAdvertisement locale={locale} type="chat" />}
    </>
  );
};

export default ChatPage;
