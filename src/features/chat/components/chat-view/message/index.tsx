import { MessageInfoDropdown } from '@/features/chat/components/chat-view/message/message-info-dropdown';
import { SystemMessage } from '@/features/chat/components/chat-view/message/system-message';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { MessageDto } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, MoreHorizontal, UserCircle } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useState } from 'react';

const messageOptionsAriaLabel: StaticTranslationString = {
  de: 'Nachrichten-Optionen',
  en: 'Message options',
  fr: 'Options de message',
};

interface MessageProperties {
  message: MessageDto;
  isCurrentUser: boolean;
}

/**
 * MessageComponent is a React component that displays a single chat message.
 *
 * @param message
 * @param isCurrentUser
 * @constructor
 */
export const MessageComponent: React.FC<MessageProperties> = ({ message, isCurrentUser }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [showInfo, setShowInfo] = useState(false);
  const formattedTime = useFormatDate().formatMessageTime(message.timestamp);
  const renderedContent = formatMessageContent(message.content);

  const handleInteraction = (event: React.MouseEvent | React.TouchEvent): void => {
    event.preventDefault();
    setShowInfo((previous) => !previous);
  };

  const renderMessageStatus = (): React.JSX.Element => {
    if (!isCurrentUser) return <></>;
    if (message.status === MessageStatusDto.CREATED) {
      return <div className="font-body ml-1 text-xs text-gray-400">Sending...</div>;
    }
    switch (message.status) {
      case MessageStatusDto.SENT: {
        return <Check className="ml-1 h-3.5 w-3.5 text-gray-400" />;
      }
      case MessageStatusDto.DELIVERED: {
        return (
          <div className="ml-1 flex">
            <Check className="h-3.5 w-3.5 text-gray-400" />
            <Check className="-ml-2 h-3.5 w-3.5 text-gray-400" />
          </div>
        );
      }
      case MessageStatusDto.READ: {
        return (
          <div className="ml-1 flex">
            <Check className="text-conveniat-green h-3.5 w-3.5" />
            <Check className="text-conveniat-green -ml-2 h-3.5 w-3.5" />
          </div>
        );
      }
    }
  };

  if (message.senderId === undefined) {
    return <SystemMessage message={message} />;
  }

  return (
    <div
      className={cn('group flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}
    >
      {!isCurrentUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <UserCircle className="h-6 w-6 text-gray-400" />
        </div>
      )}

      <div
        className={cn('flex items-center gap-2', isCurrentUser ? 'flex-row-reverse' : 'flex-row')}
        onContextMenu={handleInteraction}
      >
        <div className="relative">
          <button
            onClick={handleInteraction}
            className={cn(
              'rounded-full p-1 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100',
              { 'opacity-100': showInfo },
            )}
            aria-label={messageOptionsAriaLabel[locale]}
          >
            <MoreHorizontal className="h-5 w-5 text-gray-500" />
          </button>
          {showInfo && (
            <MessageInfoDropdown
              message={message}
              isCurrentUser={isCurrentUser}
              onClose={() => setShowInfo(false)}
            />
          )}
        </div>

        <div>
          <div
            className={cn(
              'font-body rounded-2xl px-4 py-3 shadow-sm',
              isCurrentUser
                ? 'rounded-br-md bg-green-200 text-green-800'
                : 'rounded-bl-md border border-gray-200 bg-white text-gray-900',
              message.status === MessageStatusDto.CREATED && 'opacity-60',
            )}
            style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}
          >
            {renderedContent}
          </div>
          <div className="mt-1 flex items-center justify-end text-xs">
            <span className="font-body text-gray-500">{formattedTime}</span>
            {renderMessageStatus()}
          </div>
        </div>
      </div>

      {isCurrentUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-200">
          <UserCircle className="text-conveniat-green h-6 w-6" />
        </div>
      )}
    </div>
  );
};
