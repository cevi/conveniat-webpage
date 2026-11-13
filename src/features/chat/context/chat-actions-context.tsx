'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import type { LucideIcon } from 'lucide-react';
import React, { createContext, useContext, useState } from 'react';

/**
 * A row a screen adds to the actions sheet of a message, after the built-in ones, like the
 * forum's "Melden". Choosing it closes the sheet.
 */
export interface ExtraMessageAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** red, like "Löschen" */
  destructive?: boolean;
}

/** The message the composer is changing instead of writing a new one. */
export interface EditingMessage {
  id: string;
  /** its text when editing started, which the composer starts from */
  text: string;
  /** the thread it is in, so only that thread's composer takes it up */
  parentId?: string | undefined;
}

interface ChatActionsContextType {
  activeThreadId: string | undefined;
  threadHistory: string[];
  quotedMessageId: string | undefined;
  setQuotedMessageId: (id: string | undefined) => void;
  replyInThread: (messageId: string) => void;
  closeThread: () => void;
  quoteMessage: (messageId: string) => void;
  cancelQuote: () => void;
  editingMessage: EditingMessage | undefined;
  editingMessageId: string | undefined;
  /** Puts the composer into edit mode for the message; drops a quote. */
  startEditing: (message: EditingMessage) => void;
  cancelEditing: () => void;
  /** The rows the screen adds to the actions sheet of this message. */
  extraMessageActions: (message: ChatMessage) => ExtraMessageAction[];
  /** What the screen shows under this message, like the forum's flags for its moderators. */
  renderMessageFooter: (message: ChatMessage) => React.ReactNode;
  highlightedMessageId: string | undefined;
  scrollToMessage: (messageId: string) => void;
}

const ChatActionsContext = createContext<ChatActionsContextType | undefined>(undefined);

const noExtraActions = (): ExtraMessageAction[] => [];
const noFooter = (): React.ReactNode => null;

export const ChatActionsProvider: React.FC<{
  children: React.ReactNode;
  /** a screen that is one thread, like a forum post: what it writes answers this message */
  threadId?: string;
  /** rows this screen adds to the actions sheet of a message, e.g. the forum's moderation */
  messageActions?: (message: ChatMessage) => ExtraMessageAction[];
  /** what this screen shows under a message, e.g. the forum's flags for its moderators */
  renderMessageFooter?: (message: ChatMessage) => React.ReactNode;
}> = ({ children, threadId, messageActions, renderMessageFooter }) => {
  const [threadHistory, setThreadHistory] = useState<string[]>(
    threadId === undefined ? [] : [threadId],
  );
  const [quotedMessageId, setQuotedMessageId] = useState<string | undefined>();
  const [editingMessage, setEditingMessage] = useState<EditingMessage | undefined>();
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>();

  const activeThreadId = threadHistory.length > 0 ? threadHistory.at(-1) : undefined;

  const replyInThread = (messageId: string): void => {
    setThreadHistory((previous) => [...previous, messageId]);
  };

  const closeThread = (): void => {
    setThreadHistory((previous) => previous.slice(0, -1));
  };

  // a message is either answered or changed, never both at once
  const quoteMessage = (messageId: string): void => {
    setEditingMessage(undefined);
    setQuotedMessageId(messageId);
  };

  const cancelQuote = (): void => {
    setQuotedMessageId(undefined);
  };

  const startEditing = (message: EditingMessage): void => {
    setQuotedMessageId(undefined);
    setEditingMessage(message);
  };

  const cancelEditing = (): void => {
    setEditingMessage(undefined);
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
        editingMessage,
        editingMessageId: editingMessage?.id,
        startEditing,
        cancelEditing,
        extraMessageActions: messageActions ?? noExtraActions,
        renderMessageFooter: renderMessageFooter ?? noFooter,
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
