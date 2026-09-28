import { useAutoResizeTextarea } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-auto-resize-textarea';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { getChatDraftKey, useChatDraft } from '@/features/chat/hooks/use-chat-draft';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { useTypingSignal } from '@/features/chat/hooks/use-typing';
import { generateMessageId } from '@/features/chat/utils';
import { trpc } from '@/trpc/client';
import type React from 'react';
import { useCallback, useState } from 'react';

interface MessageInputProperties {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  ref: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}

interface UseMessageInputLogicResult {
  textareaProps: MessageInputProperties;
  handleSendMessage: () => void;
  sendText: (text: string) => void;
  takeMessage: () => string;
  restoreMessage: (text: string) => void;
  isSendButtonDisabled: boolean;
  messageLength: number;
  isGlobalMessagingDisabled: boolean;
  sendError: string | undefined;
}

import { useChatActions } from '@/features/chat/context/chat-actions-context';

import { useSearchParams } from 'next/navigation';

export const useMessageInput = (): UseMessageInputLogicResult => {
  const searchParameters = useSearchParams();
  const [newMessage, setNewMessage] = useState(() => {
    const shareText = searchParameters.get('text');
    const shareTitle = searchParameters.get('title');
    const shareUrl = searchParameters.get('url');

    const parts = [shareTitle, shareText, shareUrl].filter(Boolean);
    return parts.length > 0 ? parts.join('\n') : '';
  });
  const [sendError, setSendError] = useState<string>();
  const chatId = useChatId();
  const sendMessageMutation = useMessageSend();
  const { textareaRef: messageInputReference, resize: resizeTextarea } =
    useAutoResizeTextarea(newMessage);
  const { activeThreadId, quotedMessageId, cancelQuote } = useChatActions();

  // fixed at mount: the main composer stays mounted under an open thread and must not
  // take over the draft of the thread composer on top of it
  const [draftKey] = useState(() => getChatDraftKey(chatId, activeThreadId));
  useChatDraft(draftKey, newMessage, setNewMessage);

  const { data: featureFlags, isLoading: isLoadingFlags } = trpc.chat.getFeatureFlags.useQuery(
    undefined,
    {
      refetchInterval: 30_000, // Poll every 30 seconds

      staleTime: 1000 * 60 * 5,
    },
  );

  const isGlobalMessagingEnabled =
    featureFlags?.find((f) => f.key === 'send_messages')?.isEnabled ?? true;

  /** Sends `text` as a message, without touching the composer. */
  const sendText = useCallback(
    (text: string): void => {
      if (!isGlobalMessagingEnabled) return;
      // Clear any previous error
      setSendError(undefined);

      sendMessageMutation.mutate(
        {
          chatId: chatId,
          content: text,
          timestamp: new Date(),
          parentId: activeThreadId ?? undefined,
          quotedMessageId: quotedMessageId ?? undefined,
          // the client owns the message id so that a replay (offline outbox, lost
          // response) is recognised by the server instead of stored a second time
          messageId: generateMessageId(),
        },
        {
          onSuccess: () => {
            if (quotedMessageId) cancelQuote();

            // Clear shared query parameters from the URL
            if ('history' in globalThis && 'location' in globalThis) {
              const url = new globalThis.URL(globalThis.location.href);
              const hasText = url.searchParams.has('text');
              const hasTitle = url.searchParams.has('title');
              const hasUrl = url.searchParams.has('url');
              if (hasText || hasTitle || hasUrl) {
                url.searchParams.delete('text');
                url.searchParams.delete('title');
                url.searchParams.delete('url');
                globalThis.history.replaceState(
                  globalThis.history.state,
                  '',
                  url.pathname + url.search,
                );
              }
            }
          },
          onError: (error) => {
            // The send waits in the outbox; the server's message says why, in the user's language.
            if (error.data?.code === 'TOO_MANY_REQUESTS') {
              setSendError(error.message);
              return;
            }
            // offline sends are queued by useMessageSend. Any other failed bubble stays in the
            // list with its own retry, so the text is not put back into the composer. Only a
            // disabled chat is worth a banner, because retrying cannot help there.
            if (error.message !== 'Messaging is disabled in this chat or globally.') return;
            const errorMessage = 'Messaging is currently disabled. Please try again later.';
            setSendError(errorMessage);
          },
        },
      );
    },
    [
      chatId,
      sendMessageMutation,
      isGlobalMessagingEnabled,
      activeThreadId,
      quotedMessageId,
      cancelQuote,
    ],
  );

  const handleSendMessage = useCallback((): void => {
    if (!isGlobalMessagingEnabled) return;
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '') return;
    // Optimistically clear the input
    setNewMessage('');
    resizeTextarea();
    sendText(trimmedMessage);
  }, [newMessage, isGlobalMessagingEnabled, resizeTextarea, sendText]);

  /** Empties the composer and returns what it held, for a send that has to wait. */
  const takeMessage = useCallback((): string => {
    const trimmedMessage = newMessage.trim();
    setNewMessage('');
    return trimmedMessage;
  }, [newMessage]);

  /** Puts taken text back, in front of anything typed in the meantime. */
  const restoreMessage = useCallback((text: string): void => {
    if (text === '') return;
    setNewMessage((current) => (current === '' ? text : `${text}\n${current}`));
  }, []);

  const signalTyping = useTypingSignal(chatId, activeThreadId);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setNewMessage(event.target.value);
      if (event.target.value.trim() !== '') signalTyping();
    },
    [signalTyping],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const isSendButtonDisabled =
    newMessage.trim() === '' ||
    sendMessageMutation.isPending ||
    !isGlobalMessagingEnabled ||
    isLoadingFlags;

  return {
    textareaProps: {
      value: newMessage,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      ref: messageInputReference,
      disabled: !isGlobalMessagingEnabled,
    },
    handleSendMessage,
    sendText,
    takeMessage,
    restoreMessage,
    isSendButtonDisabled,
    messageLength: newMessage.length,
    isGlobalMessagingDisabled: !isGlobalMessagingEnabled,
    sendError,
  };
};
