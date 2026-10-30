import { AppAdvertisement } from '@/components/app-advertisement';
import { NoChatSelected } from '@/features/chat/components/chat-overview-view/no-chat-selected';
import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import type React from 'react';

/**
 * Chat overview. The list itself comes from the layout, which keeps it beside an open chat on a
 * desktop; the page is what stands next to it while no chat is open.
 */
const ChatPage: React.FC<{
  params: Promise<{ locale: Locale; design: DesignCodes }>;
}> = async ({ params }) => {
  const { locale, design } = await params;

  return (
    <>
      <NoChatSelected locale={locale} />
      {design !== DesignCodes.APP_DESIGN && <AppAdvertisement locale={locale} type="chat" />}
    </>
  );
};

export default ChatPage;
