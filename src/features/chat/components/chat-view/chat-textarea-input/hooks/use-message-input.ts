import { useAutoResizeTextarea } from '@/features/chat/components/chat-view/chat-textarea-input/hooks/use-auto-resize-textarea';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import type React from 'react';
import { useCallback, useState } from 'react';

interface MessageInputProperties {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  ref: React.RefObject<HTMLTextAreaElement | null>;
}

interface UseMessageInputLogicResult {
  textareaProps: MessageInputProperties;
  handleSendMessage: () => void;
  isSendButtonDisabled: boolean;
  messageLength: number;
}

export const useMessageInput = (): UseMessageInputLogicResult => {
  const [newMessage, setNewMessage] = useState('');
  const chatId = useChatId();
  const sendMessageMutation = useMessageSend();
  const { textareaRef: messageInputReference, resize: resizeTextarea } =
    useAutoResizeTextarea(newMessage);

  const handleSendMessage = useCallback((): void => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '') {
      return;
    }

    setNewMessage('');
    resizeTextarea();

    sendMessageMutation.mutate({
      chatId: chatId,
      content: trimmedMessage,
      timestamp: new Date(),
    });
  }, [newMessage, chatId, sendMessageMutation, resizeTextarea]);

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

  const isSendButtonDisabled = newMessage.trim() === '' || sendMessageMutation.isPending;

  return {
    textareaProps: {
      value: newMessage,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      ref: messageInputReference,
    },
    handleSendMessage,
    isSendButtonDisabled,
    messageLength: newMessage.length,
  };
};
