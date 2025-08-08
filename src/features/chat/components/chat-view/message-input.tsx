'use client';

import { Button } from '@/components/ui/buttons/button';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Send } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';

const messagePlaceholder: StaticTranslationString = {
  de: 'Nachricht eingeben...',
  en: 'Type a message...',
  fr: 'Tapez un message...',
};

export const MessageInput: React.FC = () => {
  const [newMessage, setNewMessage] = useState('');
  const sendMessageMutation = useMessageSend();
  const textareaReference = useRef<HTMLTextAreaElement>(null);
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const handleSendMessage = (): void => {
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '') {
      return;
    }

    setNewMessage('');

    if (textareaReference.current) {
      textareaReference.current.style.height = 'auto';
      textareaReference.current.style.height = `${textareaReference.current.scrollHeight}px`;
    }

    sendMessageMutation.mutate(trimmedMessage);
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setNewMessage(event.target.value);
  };

  useEffect(() => {
    if (textareaReference.current) {
      textareaReference.current.style.height = 'auto';
      textareaReference.current.style.height = `${textareaReference.current.scrollHeight}px`;
    }
  }, [newMessage]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <textarea
        ref={textareaReference}
        value={newMessage}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={messagePlaceholder[locale]}
        className="font-body flex-1 resize-none rounded-lg border-0 bg-transparent py-2 pr-10 pl-3 placeholder:text-gray-500 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none" // Removed overflow-hidden and added focus styles
        rows={1}
        style={{ minHeight: '40px', maxHeight: '250px' }}
      />
      <Button
        onClick={handleSendMessage}
        size="icon"
        className="h-10 w-10 rounded-full bg-green-400 text-green-900 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-700"
        disabled={newMessage.trim() === '' || sendMessageMutation.isPending}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
};
