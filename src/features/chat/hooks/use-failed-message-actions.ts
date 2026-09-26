'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { takeFailedSend } from '@/features/chat/utils/failed-sends';
import { trpc } from '@/trpc/client';
import { useCallback } from 'react';

/**
 * Retry and discard for a bubble whose send failed. A retry reuses the message id, which the
 * server recognises, so a send that did land after all is not stored twice.
 */
export const useFailedMessageActions = (): {
  retry: (message: ChatMessage) => void;
  discard: (message: ChatMessage) => void;
} => {
  const chatId = useChatId();
  const trpcUtils = trpc.useUtils();
  const sendMessageMutation = useMessageSend();

  const retry = useCallback(
    (message: ChatMessage): void => {
      const payload = message.messagePayload as Record<string, unknown>;
      const text = typeof payload['text'] === 'string' ? payload['text'] : '';
      const quotedMessageId =
        typeof payload['quotedMessageId'] === 'string' ? payload['quotedMessageId'] : undefined;

      sendMessageMutation.mutate(
        takeFailedSend(message.id) ?? {
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
      takeFailedSend(message.id);
      trpcUtils.chat.infiniteMessages.setInfiniteData(
        { chatId, limit: CHAT_PAGE_SIZE, parentId: message.parentId },
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
        trpcUtils.chat.chatDetails.setData(
          { chatId },
          (old) => old && { ...old, messages: old.messages.filter((m) => m.id !== message.id) },
        );
      }
    },
    [chatId, trpcUtils],
  );

  return { retry, discard };
};
