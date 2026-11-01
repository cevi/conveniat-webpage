'use client';

import type { PendingChatDeletion } from '@/features/chat/hooks/use-pending-chat-deletion';
import { usePendingChatDeletion } from '@/features/chat/hooks/use-pending-chat-deletion';
import type React from 'react';
import { createContext, useContext } from 'react';

const PendingChatDeletionContext = createContext<PendingChatDeletion | undefined>(undefined);

/**
 * Holds the chat deleted with a moment to undo for every screen under the chat layout, so that a
 * delete from a chat's details lands on the list, which hides the chat and offers the undo.
 */
export const PendingChatDeletionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <PendingChatDeletionContext value={usePendingChatDeletion()}>
    {children}
  </PendingChatDeletionContext>
);

/** The chat deleted with a moment to undo, see {@link usePendingChatDeletion}. */
export const usePendingChatDeletionContext = (): PendingChatDeletion => {
  const context = useContext(PendingChatDeletionContext);
  if (context === undefined) {
    throw new Error('usePendingChatDeletionContext needs a PendingChatDeletionProvider');
  }
  return context;
};
