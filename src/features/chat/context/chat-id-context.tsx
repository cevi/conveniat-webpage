'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

/** Captures the chat id from `/[locale]/[design]/app/chat/<chatId>[/...]`. */
const CHAT_ID_FROM_PATHNAME = /\/app\/chat\/([^/]+)/;

interface ChatIdContextType {
  chatId: string | undefined;
}

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

interface ChatIdProviderProperties {
  children: ReactNode;
  /** the chat outside its own route, like a sheet on the chat list; on the route the URL names it */
  chatId?: string;
}

export const ChatIdProvider: React.FC<ChatIdProviderProperties> = ({ children, chatId }) => {
  const pathname = usePathname();

  // On `/app/chat/<chatId>` the browser URL names the chat, also when the service worker
  // replays a shell cached for another chat, or the router shows the App Shell it shares
  // with every chat.
  const chatIdFromPathname = CHAT_ID_FROM_PATHNAME.exec(pathname)?.[1];
  const resolvedChatId =
    chatIdFromPathname === undefined ? chatId : decodeURIComponent(chatIdFromPathname);

  return (
    <ChatIdContext.Provider value={{ chatId: resolvedChatId }}>{children}</ChatIdContext.Provider>
  );
};

export const useChatId = (): string => {
  const context = useContext(ChatIdContext);
  if (context === undefined) {
    throw new Error('useChatId must be used within a ChatIdProvider');
  }
  return context.chatId as string;
};
