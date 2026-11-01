'use client';

import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import { useCallback, useEffect, useRef, useState } from 'react';

/** how long a deleted chat can be brought back before the server hears of it */
export const CHAT_DELETION_UNDO_MS = 5000;

export interface PendingChatDeletion {
  /** the chat deleted in the list but not yet on the server, hidden from the list meanwhile */
  chatId: string | undefined;
  deleteChat: (chatId: string) => void;
  undo: () => void;
}

/**
 * Deletes a chat from the list with a moment to take it back. For an owner or admin the delete
 * archives the chat for every member, so it is only sent once the moment has passed: an undo
 * then sends nothing, and the other members never see the chat archived and reopened.
 *
 * Leaving the list, a second delete or the app going to the background sends the pending one at
 * once, so a delete the user saw happen is not lost.
 */
export const usePendingChatDeletion = (): PendingChatDeletion => {
  const archiveChatMutation = useArchiveChatMutation();
  const [chatId, setChatId] = useState<string | undefined>();
  const pending = useRef<{ chatId: string; timer: ReturnType<typeof setTimeout> } | undefined>(
    undefined,
  );
  // read through a ref, so that sending on unmount does not hang on the mutation's identity
  const mutate = useRef(archiveChatMutation.mutate);
  useEffect(() => {
    mutate.current = archiveChatMutation.mutate;
  }, [archiveChatMutation.mutate]);

  const flush = useCallback((): void => {
    const current = pending.current;
    if (current === undefined) return;
    pending.current = undefined;
    clearTimeout(current.timer);
    mutate.current({ chatUuid: current.chatId });
    setChatId(undefined);
  }, []);

  const deleteChat = useCallback(
    (id: string): void => {
      flush();
      pending.current = { chatId: id, timer: setTimeout(flush, CHAT_DELETION_UNDO_MS) };
      setChatId(id);
    },
    [flush],
  );

  const undo = useCallback((): void => {
    if (pending.current !== undefined) clearTimeout(pending.current.timer);
    pending.current = undefined;
    setChatId(undefined);
  }, []);

  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return (): void => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, [flush]);

  return { chatId, deleteChat, undo };
};
