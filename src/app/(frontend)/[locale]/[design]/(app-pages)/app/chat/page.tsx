import { NoChatSelected } from '@/features/chat/components/chat-overview-view/no-chat-selected';
import type { Locale } from '@/types/types';
import type React from 'react';

/**
 * Chat overview. The list itself comes from the layout, which keeps it beside an open chat on a
 * desktop; the page is what stands next to it while no chat is open.
 */
const ChatPage: React.FC<{
  params: Promise<{ locale: Locale }>;
}> = async ({ params }) => {
  const { locale } = await params;

  // the bar advertising the app comes with the global footer on every `/app` page
  return <NoChatSelected locale={locale} />;
};

export default ChatPage;
