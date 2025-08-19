import type { ChatMessage } from '@/features/chat/api/queries/chat';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import React from 'react';

/**
 * Renders a system message in the chat.
 *
 * @param content
 * @constructor
 */
export const SystemMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const renderedContent = formatMessageContent(message.messagePayload);
  return (
    <div className="flex items-center justify-center p-4 text-gray-500">
      <span className="font-body text-center text-balance" style={{ whiteSpace: 'pre-wrap' }}>
        {renderedContent}
      </span>
    </div>
  );
};
