import type { ChatMessage } from '@/features/chat/api/types';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { i18nConfig, type Locale } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

/**
 * Renders a system message in the chat.
 *
 * @param content
 * @constructor
 */
export const SystemMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const renderedContent = formatMessageContent(message.messagePayload, locale);
  return (
    <div className="flex items-center justify-center p-4 text-gray-500">
      <span className="font-body text-center text-balance" style={{ whiteSpace: 'pre-wrap' }}>
        {renderedContent}
      </span>
    </div>
  );
};
