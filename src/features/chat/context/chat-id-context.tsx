'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, startTransition, useContext, useOptimistic } from 'react';

/** Captures the chat id from `/[locale]/[design]/app/chat/<chatId>[/...]`. */
const CHAT_ID_FROM_PATHNAME = /\/app\/chat\/([^/]+)/;

/** `…/app/chat/<chatId>`: an open chat, not the overview, a step under a chat or a static route. */
const OPEN_CHAT_PATHNAME = /\/app\/chat\/(?!new\/?$)[^/]+\/?$/;

/** Whether the pathname is the screen of an open chat, the one every chat shares. */
export const isOpenChatPathname = (pathname: string): boolean => OPEN_CHAT_PATHNAME.test(pathname);

interface OpeningChat {
  /** the chat tapped while another is open, until the router has navigated to it */
  openingChatId: string | undefined;
  /** shows the chat right away; call it as the router starts navigating to it */
  showOpeningChat: (chatId: string) => void;
}

const OpeningChatContext = createContext<OpeningChat | undefined>(undefined);

/**
 * Every chat is the same client-rendered screen, so a chat tapped while another is open can be
 * shown before the router has the new route. Without it the old chat stayed on screen until the
 * server answered, which on a slow or just resumed connection took seconds. The router still
 * navigates, so the history and its state stay its own; the optimistic id ends with that
 * navigation, as `useLinkStatus` does.
 */
export const OpeningChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // useOptimistic needs its passthrough value, here no chat being opened
  // eslint-disable-next-line unicorn/no-useless-undefined
  const [openingChatId, setOpeningChatId] = useOptimistic<string | undefined>(undefined);
  const showOpeningChat = (chatId: string): void => {
    startTransition(() => setOpeningChatId(chatId));
  };
  return (
    <OpeningChatContext value={{ openingChatId, showOpeningChat }}>{children}</OpeningChatContext>
  );
};

/** The chat being opened beside an open one, see `OpeningChatProvider`. */
export const useOpeningChat = (): OpeningChat | undefined => useContext(OpeningChatContext);

interface ChatIdContextType {
  chatId: string | undefined;
}

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

interface ChatIdProviderProperties {
  children: ReactNode;
  /**
   * a chat named by what it belongs to, like a sheet on the chat list; it wins over the URL, which
   * beside an open chat on a desktop names that other chat
   */
  chatId?: string;
}

export const ChatIdProvider: React.FC<ChatIdProviderProperties> = ({ children, chatId }) => {
  const pathname = usePathname();
  const openingChatId = useOpeningChat()?.openingChatId;

  // Without a named chat, on `/app/chat/<chatId>` the browser URL names it, also when the
  // service worker replays a shell cached for another chat, or the router shows the App Shell
  // it shares with every chat. A chat being opened from there is shown before its URL arrives.
  const chatIdFromPathname = CHAT_ID_FROM_PATHNAME.exec(pathname)?.[1];
  let resolvedChatId = chatId;
  if (chatId === undefined && chatIdFromPathname !== undefined) {
    resolvedChatId = openingChatId ?? decodeURIComponent(chatIdFromPathname);
  }

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
