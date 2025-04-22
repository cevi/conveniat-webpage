'use client';

import { Button } from '@/components/ui/buttons/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import type React from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

interface MessageInputProperties {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
}

export const MessageInput: React.FC<MessageInputProperties> = ({ value, onChange, onSend }) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey && value.trim() !== '') {
      event.preventDefault();
      onSend(value.trim());
    }
  };

  const handleSendClick = (): void => {
    if (value.trim() !== '') {
      onSend(value.trim());
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 rounded-full"
      />
      <Button
        onClick={handleSendClick}
        size="icon"
        className="rounded-full"
        disabled={value.trim() === ''}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
};
