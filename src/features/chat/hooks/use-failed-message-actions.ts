'use client';
import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { forgetFailedSend, getFailedSendInput } from '@/features/chat/utils/failed-sends';
import { useTRPC } from '@/trpc/client';
import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

/**
 * Retry and discard for a bubble whose send failed. A retry reuses the message id, which the
 * server recognises, so a send that did land after all is not stored twice.
 */
export const useFailedMessageActions = (): {
  retry: (message: ChatMessage) => void;
  discard: (message: ChatMessage) => void;
} => {
  const trpc = useTRPC();
  const chatId = useChatId();
  const queryClient = useQueryClient();
  const sendMessageMutation = useMessageSend();

  const retry = useCallback(
    (message: ChatMessage): void => {
      const payload = message.messagePayload as Record<string, unknown>;
      const text = typeof payload['text'] === 'string' ? payload['text'] : '';
      const quotedMessageId =
        typeof payload['quotedMessageId'] === 'string' ? payload['quotedMessageId'] : undefined;

      sendMessageMutation.mutate(
        getFailedSendInput(message.id) ?? {
          chatId,
          content: text,
          timestamp: new Date(message.createdAt),
          parentId: message.parentId,
          quotedMessageId,
          messageId: message.id,
        },
      );
    },
    [chatId, sendMessageMutation],
  );

  const discard = useCallback(
    (message: ChatMessage): void => {
      forgetFailedSend(message.id);
      queryClient.setQueryData(
        trpc.chat.infiniteMessages.infiniteQueryKey({
          chatId,
          limit: CHAT_PAGE_SIZE,
          parentId: message.parentId,
        }),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== message.id),
            })),
          },
      );
      if (message.parentId === undefined) {
        queryClient.setQueryData(
          trpc.chat.chatDetails.queryKey({ chatId }),
          (old) => old && { ...old, messages: old.messages.filter((m) => m.id !== message.id) },
        );
      }
      void queryClient.invalidateQueries(trpc.chat.chats.pathFilter());
    },
    [chatId, queryClient, trpc],
  );

  return { retry, discard };
};
