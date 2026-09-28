import type { ChatMessage } from '@/features/chat/api/types';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import type { Locale } from '@/types/types';
import type React from 'react';

interface MessageFrameProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  /** The sender's functions in the camp organisation, shown with their name; may be empty. */
  senderFunktionen: string;
  locale: Locale;
  children: React.ReactNode;
}

/**
 * Sender and time around a message that is not a text bubble, a shared location or a question
 * and answer of an alert, so that it tells who sent it and when like every bubble does. The
 * sender is named in every chat type, since these messages sit on neither side of the chat.
 * Messages the system sent have no sender and only get their time.
 */
export const MessageFrame: React.FC<MessageFrameProperties> = ({
  message,
  isCurrentUser,
  senderFunktionen,
  locale,
  children,
}) => {
  const senderName = message.senderName ?? '';

  return (
    <div id={`message-${message.id}`} className="flex w-full flex-col px-2">
      {!isCurrentUser && senderName !== '' && (
        <span className="mb-1 px-1.5 text-xs font-semibold text-gray-500">
          {senderName}
          {senderFunktionen !== '' && (
            <span className="text-conveniat-green font-medium"> · {senderFunktionen}</span>
          )}
        </span>
      )}
      {children}
      <span className="font-body mt-1 px-1.5 text-right text-[10px] text-gray-400">
        {formatMessageTimeOnlyRaw(message.createdAt, locale)}
      </span>
    </div>
  );
};
