'use client';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { useTRPC } from '@/trpc/client';
import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

type ChatPatch = (chat: ChatWithMessagePreview) => ChatWithMessagePreview;

export interface ChatListActions {
  pin: (chat: ChatWithMessagePreview, pinned: boolean) => void;
  mute: (chat: ChatWithMessagePreview, muted: boolean) => void;
  /** marks the chat unread, or read again, which also clears its real unread messages */
  markUnread: (chat: ChatWithMessagePreview, unread: boolean) => void;
  /** set when the last action failed and was rolled back */
  hasFailed: boolean;
  dismissFailure: () => void;
}

/**
 * The actions of a chat's long-press sheet: pin, mute and mark unread. Each shows at once in
 * the cached chat list, is rolled back if the server refuses it, and the list is fetched again
 * once the server has it.
 */
export const useChatListActions = (): ChatListActions => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [hasFailed, setHasFailed] = useState(false);

  /** Applies `patch` to the cached chat and returns how to undo it. */
  const applyOptimistically = (chatId: string, patch: ChatPatch): (() => void) => {
    const previous = queryClient.getQueryData(trpc.chat.chats.queryKey({}));
    void queryClient.cancelQueries(trpc.chat.chats.pathFilter());
    queryClient.setQueryData(trpc.chat.chats.queryKey({}), (chats) =>
      chats?.map((chat) => (chat.id === chatId ? patch(chat) : chat)),
    );
    return () => queryClient.setQueryData(trpc.chat.chats.queryKey({}), previous);
  };

  const settle = {
    onSuccess: (): void => {
      void queryClient.invalidateQueries(trpc.chat.chats.pathFilter());
    },
  };

  const pinMutation = useMutation(trpc.chat.pinChat.mutationOptions(settle));
  const muteMutation = useMutation(trpc.chat.muteChat.mutationOptions(settle));
  const unreadMutation = useMutation(trpc.chat.markChatUnread.mutationOptions(settle));
  const readMutation = useMutation(trpc.chat.markChatAsRead.mutationOptions(settle));

  const run = (
    chatId: string,
    patch: ChatPatch,
    mutate: (callbacks: { onError: () => void }) => void,
  ): void => {
    setHasFailed(false);
    const undo = applyOptimistically(chatId, patch);
    mutate({
      onError: () => {
        undo();
        setHasFailed(true);
      },
    });
  };

  return {
    pin: (chat, pinned) =>
      run(
        chat.id,
        (cached) => ({
          ...cached,
          isPinnedByMe: pinned,
          isPinned: pinned || cached.isPinnedForEveryone === true,
        }),
        (callbacks) => pinMutation.mutate({ chatId: chat.id, pinned }, callbacks),
      ),
    mute: (chat, muted) =>
      run(
        chat.id,
        (cached) => ({ ...cached, isMuted: muted }),
        (callbacks) => muteMutation.mutate({ chatId: chat.id, muted }, callbacks),
      ),
    markUnread: (chat, unread): void => {
      if (unread) {
        run(
          chat.id,
          (cached) => ({
            ...cached,
            isMarkedUnread: true,
            unreadCount: Math.max(1, cached.unreadCount),
          }),
          (callbacks) => unreadMutation.mutate({ chatId: chat.id, unread: true }, callbacks),
        );
        return;
      }
      const lastMessageId = chat.lastMessage?.id;
      run(
        chat.id,
        (cached) => ({ ...cached, isMarkedUnread: false, unreadCount: 0 }),
        // reading up to the last message also takes away the own mark; a chat without a
        // stored last message can only carry the mark
        (callbacks) =>
          lastMessageId !== undefined && UUID.test(lastMessageId)
            ? readMutation.mutate({ chatId: chat.id, lastMessageId }, callbacks)
            : unreadMutation.mutate({ chatId: chat.id, unread: false }, callbacks),
      );
    },
    hasFailed,
    dismissFailure: () => setHasFailed(false),
  };
};
