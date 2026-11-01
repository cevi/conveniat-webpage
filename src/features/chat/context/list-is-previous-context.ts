'use client';

import { createContext, useContext } from 'react';

/**
 * Whether the chat list is the history entry right before the current screen, so going back in
 * the browser returns to it. The chat layout tracks it, as only it sees every move under
 * `/app/chat`; a chat opened from a push, a link or another tab of the app says `false`.
 */
export const ListIsPreviousContext = createContext<boolean>(false);

/** Whether the chat list is the previous history entry, see {@link ListIsPreviousContext}. */
export const useListIsPrevious = (): boolean => useContext(ListIsPreviousContext);
