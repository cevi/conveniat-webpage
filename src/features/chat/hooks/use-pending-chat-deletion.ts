'use client';

import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import { useCallback, useEffect, useRef, useState } from 'react';

/** how long a deleted chat can be brought back before the server hears of it */
export const CHAT_DELETION_UNDO_MS = 5000;

export interface ChatToDelete {
  chatId: string;
  /** whether the delete archives the chat for every member, not only hides it from the user */
  forEveryone: boolean;
}

export interface PendingChatDeletion {
  /** the chat deleted in the list but not yet on the server, hidden from the list meanwhile */
  pending: ChatToDelete | undefined;
  deleteChat: (chat: ChatToDelete) => void;
  undo: () => void;
  /**
   * Stops the time while the user touches, points at or focuses the undo, and gives the full
   * time again once they let go, so nobody loses the undo while reaching for it.
   */
  hold: (held: boolean) => void;
}

/**
 * Deletes a chat with a moment to take it back. For an owner or admin the delete archives the
 * chat for every member, so it is only sent once the moment has passed: an undo then sends
 * nothing, and the other members never see the chat archived and reopened.
 *
 * Leaving the chats, a second delete or the app going to the background sends the pending one at
 * once, so a delete the user saw happen is not lost.
 */
export const usePendingChatDeletion = (): PendingChatDeletion => {
  const archiveChatMutation = useArchiveChatMutation();
  const [pending, setPending] = useState<ChatToDelete | undefined>();
  const current = useRef<{ chat: ChatToDelete; timer: ReturnType<typeof setTimeout> | undefined }>(
    undefined,
  );
  // read through a ref, so that sending on unmount does not hang on the mutation's identity
  const mutate = useRef(archiveChatMutation.mutate);
  useEffect(() => {
    mutate.current = archiveChatMutation.mutate;
  }, [archiveChatMutation.mutate]);

  const flush = useCallback((): void => {
    const deletion = current.current;
    if (deletion === undefined) return;
    current.current = undefined;
    clearTimeout(deletion.timer);
    mutate.current({ chatUuid: deletion.chat.chatId });
    setPending(undefined);
  }, []);

  const deleteChat = useCallback(
    (chat: ChatToDelete): void => {
      flush();
      current.current = { chat, timer: setTimeout(flush, CHAT_DELETION_UNDO_MS) };
      setPending(chat);
    },
    [flush],
  );

  const undo = useCallback((): void => {
    clearTimeout(current.current?.timer);
    current.current = undefined;
    setPending(undefined);
  }, []);

  const hold = useCallback(
    (held: boolean): void => {
      const deletion = current.current;
      if (deletion === undefined) return;
      clearTimeout(deletion.timer);
      deletion.timer = held ? undefined : setTimeout(flush, CHAT_DELETION_UNDO_MS);
    },
    [flush],
  );

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

  return { pending, deleteChat, undo, hold };
};
