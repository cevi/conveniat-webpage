'use client';

import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { Send } from 'lucide-react';
import type React from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useState } from 'react';

interface MessageInputProperties {
  chatId: string;
}

export const MessageInput: React.FC<MessageInputProperties> = ({ chatId }) => {
  const [newMessage, setNewMessage] = useState('');
  const sendMessageMutation = useMessageSend(chatId);

  const handleSendMessage = (): void => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '') {
      return;
    }

    setNewMessage('');

    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setNewMessage(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendClick = (): void => {
    handleSendMessage();
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={newMessage}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 rounded-full"
      />
      <Button
        onClick={handleSendClick}
        size="icon"
        className="rounded-full"
        disabled={newMessage.trim() === '' || sendMessageMutation.isPending}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
};
