'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

interface ChatIdContextType {
  chatId: string | null;
}

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

interface ChatIdProviderProperties {
  children: ReactNode;
  chatId: string;
}

export const ChatIdProvider: React.FC<ChatIdProviderProperties> = ({ children, chatId }) => {
  return <ChatIdContext.Provider value={{ chatId }}>{children}</ChatIdContext.Provider>;
};

export const useChatId = (): string => {
  const context = useContext(ChatIdContext);
  if (context === undefined) {
    throw new Error('useChatId must be used within a ChatIdProvider');
  }
  return context.chatId as string;
};
