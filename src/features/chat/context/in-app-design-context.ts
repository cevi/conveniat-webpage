'use client';

import { createContext, useContext } from 'react';

/**
 * Whether the chats are shown in the app or in a browser, for a screen under the chat layout that
 * says something only a browser needs to hear. The layout reads it from the route.
 */
export const InAppDesignContext = createContext<boolean>(true);

/** Whether the chats are shown in the app, see {@link InAppDesignContext}. */
export const useInAppDesign = (): boolean => useContext(InAppDesignContext);
