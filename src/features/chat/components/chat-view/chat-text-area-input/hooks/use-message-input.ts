import { useAutoResizeTextarea } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-auto-resize-textarea';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { trpc } from '@/trpc/client';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

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
  isSendButtonDisabled: boolean;
  messageLength: number;
  isGlobalMessagingDisabled: boolean;
  sendError: string | undefined;
}

export const useMessageInput = (): UseMessageInputLogicResult => {
  const [newMessage, setNewMessage] = useState('');
  const [sendError, setSendError] = useState<string>();
  const chatId = useChatId();
  const sendMessageMutation = useMessageSend();
  const { textareaRef: messageInputReference, resize: resizeTextarea } =
    useAutoResizeTextarea(newMessage);

  // Keep a ref to the pending message so we can restore it on error
  const pendingMessageReference = useRef<string | undefined>(undefined);

  const { data: featureFlags, isLoading: isLoadingFlags } = trpc.chat.getFeatureFlags.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Poll every 5 seconds
    },
  );

  const isGlobalMessagingEnabled =
    featureFlags?.find((f) => f.key === 'send_messages')?.isEnabled ?? true;

  const handleSendMessage = useCallback((): void => {
    if (!isGlobalMessagingEnabled) return;

    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '') {
      return;
    }

    // Clear any previous error
    setSendError(undefined);

    // Store the message in case we need to restore it on error
    pendingMessageReference.current = trimmedMessage;

    // Optimistically clear the input
    setNewMessage('');
    resizeTextarea();

    sendMessageMutation.mutate(
      {
        chatId: chatId,
        content: trimmedMessage,
        timestamp: new Date(),
      },
      {
        onSuccess: () => {
          // Message sent successfully, clear the pending message ref
          pendingMessageReference.current = undefined;
        },
        onError: (error) => {
          // Restore the message on error so user can retry
          if (pendingMessageReference.current) {
            setNewMessage(pendingMessageReference.current);
            pendingMessageReference.current = undefined;
          }
          // Set a user-friendly error message
          const errorMessage =
            error.message === 'Messaging is disabled in this chat or globally.'
              ? 'Messaging is currently disabled. Please try again later.'
              : 'Failed to send message. Please try again.';
          setSendError(errorMessage);
        },
      },
    );
  }, [newMessage, chatId, sendMessageMutation, resizeTextarea, isGlobalMessagingEnabled]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setNewMessage(event.target.value);
  }, []);

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
    isSendButtonDisabled,
    messageLength: newMessage.length,
    isGlobalMessagingDisabled: !isGlobalMessagingEnabled,
    sendError,
  };
};
