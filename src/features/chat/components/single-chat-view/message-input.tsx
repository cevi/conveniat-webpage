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
    <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white p-2 shadow-sm">
      <Input
        value={newMessage}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="font-body flex-1 border-0 bg-transparent placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        onClick={handleSendClick}
        size="icon"
        className="bg-conveniat-green h-10 w-10 rounded-full hover:bg-green-600 disabled:bg-gray-300"
        disabled={newMessage.trim() === '' || sendMessageMutation.isPending}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
};
