'use client';

import React, { createContext, useContext, useState } from 'react';

interface ChatActionsContextType {
  activeThreadId: string | undefined;
  threadHistory: string[];
  quotedMessageId: string | undefined;
  setQuotedMessageId: (id: string | undefined) => void;
  replyInThread: (messageId: string) => void;
  closeThread: () => void;
  quoteMessage: (messageId: string) => void;
  cancelQuote: () => void;
  highlightedMessageId: string | undefined;
  scrollToMessage: (messageId: string) => void;
}

const ChatActionsContext = createContext<ChatActionsContextType | undefined>(undefined);

export const ChatActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [threadHistory, setThreadHistory] = useState<string[]>([]);
  const [quotedMessageId, setQuotedMessageId] = useState<string | undefined>();
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>();

  const activeThreadId = threadHistory.length > 0 ? threadHistory.at(-1) : undefined;

  const replyInThread = (messageId: string): void => {
    setThreadHistory((previous) => [...previous, messageId]);
  };

  const closeThread = (): void => {
    setThreadHistory((previous) => previous.slice(0, -1));
  };

  const quoteMessage = (messageId: string): void => {
    setQuotedMessageId(messageId as string | undefined);
  };

  const cancelQuote = (): void => {
    setQuotedMessageId(undefined);
  };

  const scrollToMessage = (messageId: string): void => {
    const element = document.querySelector(`#message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(undefined), 2000);
    }
  };

  return (
    <ChatActionsContext.Provider
      value={{
        activeThreadId,
        threadHistory,
        quotedMessageId,
        setQuotedMessageId,
        replyInThread,
        closeThread,
        quoteMessage,
        cancelQuote,
        highlightedMessageId,
        scrollToMessage,
      }}
    >
      {children}
    </ChatActionsContext.Provider>
  );
};

export const useChatActions = (): ChatActionsContextType => {
  const context = useContext(ChatActionsContext);
  if (!context) throw new Error('useChatActions must be used within ChatActionsProvider');
  return context;
};
