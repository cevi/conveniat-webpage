'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { AlertQuestionMessage } from '@/features/chat/components/chat-view/message/alert-question-message';
import { AlertResponseMessage } from '@/features/chat/components/chat-view/message/alert-response-message';
import { ImageMessage } from '@/features/chat/components/chat-view/message/image-message';
import { LocationMessage } from '@/features/chat/components/chat-view/message/location-message';
import { MessageInfoDropdown } from '@/features/chat/components/chat-view/message/message-info-dropdown';
import { SystemMessage } from '@/features/chat/components/chat-view/message/system-message';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Loader2, MoreHorizontal, UserCircle } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useRef, useState } from 'react';

const messageOptionsAriaLabel: StaticTranslationString = {
  de: 'Nachrichten-Optionen',
  en: 'Message options',
  fr: 'Options de message',
};

interface MessageProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  chatType: string;
}

/**
 * MessageComponent is a React component that displays a single chat message.
 *
 * @param message
 * @param isCurrentUser
 * @constructor
 */

export const MessageComponent: React.FC<MessageProperties> = ({
  message,
  isCurrentUser,
  chatType,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [showInfo, setShowInfo] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const formattedTime = useFormatDate().formatMessageTime(message.createdAt);
  const renderedContent = formatMessageContent(message.messagePayload, locale);

  const handleInteraction = (event: React.MouseEvent | React.TouchEvent): void => {
    event.preventDefault();
    setShowInfo((previous) => !previous);
  };

  const handleTouchStart = (event: React.TouchEvent): void => {
    event.stopPropagation();
    setIsLongPressing(true);
    longPressTimerReference.current = setTimeout(() => {
      // Trigger haptic feedback if available
      navigator.vibrate(50);
      setShowInfo(true);
      setIsLongPressing(false);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = (): void => {
    if (longPressTimerReference.current) {
      clearTimeout(longPressTimerReference.current);
      longPressTimerReference.current = undefined;
    }
    setIsLongPressing(false);
  };

  const renderMessageStatus = (): React.JSX.Element => {
    if (!isCurrentUser) return <></>;
    if (message.status === MessageEventType.CREATED) {
      return <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-white/70" />;
    }
    switch (message.status) {
      case MessageEventType.STORED: {
        return <Check className="ml-1 h-3.5 w-3.5 text-gray-400" />;
      }
      case MessageEventType.RECEIVED: {
        return (
          <div className="ml-1 flex">
            <Check className="h-3.5 w-3.5 text-gray-400" />
            <Check className="-ml-2 h-3.5 w-3.5 text-gray-400" />
          </div>
        );
      }
      case MessageEventType.READ: {
        return (
          <div className="ml-1 flex">
            <Check className="h-3.5 w-3.5 text-white/70" />
            <Check className="-ml-2 h-3.5 w-3.5 text-white/70" />
          </div>
        );
      }

      default: {
        return <></>;
      }
    }
  };

  if (message.type === MessageType.SYSTEM_MSG) {
    return <SystemMessage message={message} />;
  }

  if (message.type === MessageType.LOCATION_MSG) {
    return <LocationMessage message={message} />;
  }

  if (message.type === ('ALERT_QUESTION' as unknown as MessageType)) {
    return <AlertQuestionMessage message={message} isCurrentUser={isCurrentUser} />;
  }

  if (message.type === ('ALERT_RESPONSE' as unknown as MessageType)) {
    return <AlertResponseMessage message={message} />;
  }

  return (
    <div
      className={cn('group flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}
    >
      {!isCurrentUser && chatType === 'GROUP' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <UserCircle className="h-6 w-6 text-gray-400" />
        </div>
      )}

      <div
        className={cn(
          'group flex items-center gap-2',
          isCurrentUser ? 'flex-row-reverse' : 'flex-row',
        )}
        onContextMenu={handleInteraction}
      >
        <div className="relative">
          <button
            onClick={handleInteraction}
            className={cn(
              'hidden rounded-full p-1 transition-all duration-200 hover:bg-gray-200/50 md:group-hover:block',
              { 'md:block': showInfo },
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

        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ touchAction: 'manipulation' }}
        >
          <div
            className={cn(
              'font-body relative min-w-[100px] rounded-2xl px-3 py-2 pb-6 shadow-sm transition-transform duration-150',
              isCurrentUser
                ? 'bg-conveniat-green rounded-br-md text-white'
                : 'rounded-bl-md border border-gray-200 bg-white text-gray-900',
              message.status === MessageEventType.CREATED && 'opacity-60',
              isLongPressing && 'scale-95',
            )}
            style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}
          >
            {message.type === MessageType.IMAGE_MSG ? (
              <ImageMessage message={message} />
            ) : (
              renderedContent
            )}
            <div
              className={cn(
                'absolute right-3 bottom-1 flex items-center justify-end text-[10px]',
                isCurrentUser ? 'text-white/70' : 'text-gray-400',
              )}
            >
              <span className="font-body mr-1">{formattedTime}</span>
              {renderMessageStatus()}
            </div>
          </div>
        </div>
      </div>

      {isCurrentUser && chatType === 'GROUP' && (
        <div className="bg-conveniat-green/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <UserCircle className="text-conveniat-green h-6 w-6" />
        </div>
      )}
    </div>
  );
};
