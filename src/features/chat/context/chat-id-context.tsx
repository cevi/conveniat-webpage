'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

/** Captures the chat id from `/[locale]/[design]/app/chat/<chatId>[/...]`. */
const CHAT_ID_FROM_PATHNAME = /\/app\/chat\/([^/]+)/;

interface ChatIdContextType {
  chatId: string | null;
}

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

interface ChatIdProviderProperties {
  children: ReactNode;
  chatId: string;
}

export const ChatIdProvider: React.FC<ChatIdProviderProperties> = ({ children, chatId }) => {
  const pathname = usePathname();

  // The service worker may replay a cached RSC shell rendered for a *different* chat when
  // this route was never visited online. The browser URL always reflects the chat the user
  // navigated to, so it takes precedence over the id baked into the server payload.
  const chatIdFromPathname = CHAT_ID_FROM_PATHNAME.exec(pathname)?.[1];
  const resolvedChatId =
    chatIdFromPathname === undefined ? chatId : decodeURIComponent(chatIdFromPathname);

  return <ChatIdContext.Provider value={{ chatId: resolvedChatId }}>{children}</ChatIdContext.Provider>;
};

export const useChatId = (): string => {
  const context = useContext(ChatIdContext);
  if (context === undefined) {
    throw new Error('useChatId must be used within a ChatIdProvider');
  }
  return context.chatId as string;
};
