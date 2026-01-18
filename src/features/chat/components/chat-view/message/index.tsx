'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { AlertQuestionMessage } from '@/features/chat/components/chat-view/message/alert-question-message';
import { AlertResponseMessage } from '@/features/chat/components/chat-view/message/alert-response-message';
import { ImageMessage } from '@/features/chat/components/chat-view/message/image-message';
import { LocationMessage } from '@/features/chat/components/chat-view/message/location-message';
import { SystemMessage } from '@/features/chat/components/chat-view/message/system-message';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Loader2, MessageSquare, UserCircle } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useRef, useState } from 'react';

const DoubleCheck: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('relative flex h-2 w-4.5 items-center', className)}>
    <Check className="absolute left-0 h-2 w-2" />
    <Check className="absolute left-1.5 h-2 w-2" />
  </div>
);

const replyToMessageText: StaticTranslationString = {
  de: 'Antwort auf eine Nachricht',
  en: 'Replying to a message',
  fr: 'Répondre à un message',
};

interface MessageProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  chatType: string;
  hideReplyCount?: boolean;
  isThreadRoot?: boolean;
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
  hideReplyCount = false,
  isThreadRoot = false,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { formatMessageTimeOnly } = useFormatDate();
  const renderedContent = formatMessageContent(message.messagePayload, locale);
  const {
    replyInThread,
    quoteMessage,
    scrollToMessage,
    highlightedMessageId,
    activeThreadId,
    selectedMessage,
    setSelectedMessage,
  } = useChatActions();
  const isHighlighted = highlightedMessageId === message.id;
  const isSelected = selectedMessage?.id === message.id;

  // Extract quotedMessageId and quoted Snippet from payload if present
  const payload = message.messagePayload as Record<string, unknown>;
  const quotedMessageId =
    typeof payload['quotedMessageId'] === 'string' ? payload['quotedMessageId'] : undefined;
  const quotedSnippet =
    typeof payload['quotedSnippet'] === 'string' ? payload['quotedSnippet'] : undefined;

  const handlePointerDown = (event: React.PointerEvent): void => {
    // Only handle primary button
    if (event.button !== 0) return;

    touchStartX.current = event.clientX;
    touchStartY.current = event.clientY;
    setIsLongPressing(true);

    longPressTimerReference.current = setTimeout(() => {
      console.log('Long press triggered', { messageId: message.id });
      if ('vibrate' in navigator) navigator.vibrate(50);
      setSelectedMessage(message);
      setIsLongPressing(false);
      longPressTimerReference.current = undefined;
    }, 500); // 500ms for long press selection
  };

  const handlePointerUp = (): void => {
    if (longPressTimerReference.current) {
      clearTimeout(longPressTimerReference.current);
      longPressTimerReference.current = undefined;
    }
    setIsLongPressing(false);

    // Trigger quote if swiped right enough
    if (swipeX > 60) {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(30);
      }
      quoteMessage(message.id);
    }
    setSwipeX(0);
  };

  const handlePointerMove = (event: React.PointerEvent): void => {
    const deltaX = event.clientX - touchStartX.current;
    const deltaY = event.clientY - touchStartY.current;

    // Only allow right swipe, cap at 80px
    const newSwipeX = Math.max(0, Math.min(deltaX, 80));
    setSwipeX(newSwipeX);

    // Cancel long-press if user moves significantly
    if ((Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) && longPressTimerReference.current) {
      clearTimeout(longPressTimerReference.current);
      longPressTimerReference.current = undefined;
      setIsLongPressing(false);
    }
  };

  const handlePointerCancel = (): void => {
    if (longPressTimerReference.current) {
      clearTimeout(longPressTimerReference.current);
      longPressTimerReference.current = undefined;
    }
    setIsLongPressing(false);
    setSwipeX(0);
  };

  const renderMessageStatus = (): React.JSX.Element => {
    if (!isCurrentUser) return <></>;
    if (message.status === MessageEventType.CREATED) {
      return <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-white/70" />;
    }
    switch (message.status) {
      case MessageEventType.STORED: {
        return <Check className="ml-1 h-3.5 w-3.5 text-gray-400 opacity-60" />;
      }
      case MessageEventType.RECEIVED: {
        return <DoubleCheck className="ml-1 text-gray-400 opacity-60" />;
      }
      case MessageEventType.READ: {
        return <DoubleCheck className="ml-1 text-white/80" />;
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
      id={`message-${message.id}`}
      className={cn(
        'group relative flex w-full items-end gap-2 transition-colors duration-200',
        isCurrentUser ? 'justify-end' : 'justify-start',
        isHighlighted && 'animate-message-highlight rounded-xl',
        isSelected && (isCurrentUser ? 'bg-cevi-blue/10' : 'bg-gray-200/50'),
      )}
    >
      {!isCurrentUser && chatType === 'GROUP' && (
        <div className="mb-1 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <UserCircle className="h-6 w-6 text-gray-400" />
        </div>
      )}

      <div
        className={cn(
          'flex max-w-[85%] flex-col py-1',
          isCurrentUser ? 'items-end pr-2' : 'items-start pl-2',
        )}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerCancel={handlePointerCancel}
          style={{
            touchAction: 'pan-y', // Allow vertical scrolling
            transform: `translateX(${swipeX}px)`,
            transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          className="cursor-pointer select-none"
          onClick={(e) => {
            if (selectedMessage && selectedMessage.id !== message.id) {
              e.preventDefault();
              e.stopPropagation(); // Prevent opening thread or other click actions
              setSelectedMessage(message);
            }
          }}
        >
          <div
            className={cn(
              'font-body relative rounded-[18px] px-4 pt-3 pb-6 shadow-sm transition-transform duration-150',
              'min-w-[120px]',
              isCurrentUser
                ? 'bg-cevi-blue rounded-br-md text-white'
                : 'rounded-bl-md border border-gray-200 bg-white text-gray-900',
              message.status === MessageEventType.CREATED && 'opacity-60',
              (isLongPressing || isSelected) && 'scale-[0.98]',
              isSelected && 'ring-cevi-blue/30 ring-2',
            )}
            style={{
              overflowWrap: 'break-word',
            }}
          >
            {/* Thread Root Label */}
            {isThreadRoot && (
              <div className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide uppercase opacity-70">
                <MessageSquare className="h-3 w-3" />
                <span>Thread</span>
              </div>
            )}
            {/* Quoted message preview */}
            {quotedMessageId && (
              <div
                onClick={(event_) => {
                  event_.stopPropagation();
                  scrollToMessage(quotedMessageId);
                }}
                className={cn(
                  'relative mb-2 cursor-pointer border-l-[3px] py-1 pl-3 transition-colors hover:bg-black/5',
                  isCurrentUser
                    ? 'border-white/40 bg-white/10 text-white/80'
                    : 'border-cevi-blue/50 bg-gray-50 text-gray-500',
                )}
              >
                <span className="line-clamp-2 text-[0.8rem] leading-snug">
                  {quotedSnippet || replyToMessageText[locale]}
                </span>
              </div>
            )}
            {message.type === MessageType.IMAGE_MSG ? (
              <div className="mb-2">
                <ImageMessage message={message} />
              </div>
            ) : (
              renderedContent
            )}
            {/* Timestamp and status - absolutely positioned at bottom right */}
            <span
              className={cn(
                'absolute right-3 bottom-1.5 inline-flex items-center gap-0.5 text-[10px]',
                isCurrentUser ? 'text-white/70' : 'text-gray-400',
              )}
            >
              <span className="font-body">{formatMessageTimeOnly(message.createdAt)}</span>
              {renderMessageStatus()}
            </span>
          </div>
        </div>

        {/* Thread Reply Count Indicator (Below Bubble) */}
        {!hideReplyCount && message.replyCount !== undefined && message.replyCount > 0 && (
          <div
            className={cn(
              'mt-1 flex cursor-pointer items-center gap-1.5 px-2 text-[0.8rem] font-bold hover:underline',
              isCurrentUser ? 'text-cevi-blue/80' : 'text-cevi-blue',
            )}
            onClick={(event_) => {
              event_.preventDefault();
              event_.stopPropagation();
              replyInThread(message.id);
            }}
          >
            <div className="relative">
              <MessageSquare className="h-3.5 w-3.5" />
              {message.hasUnreadReplies && activeThreadId !== message.id && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="whitespace-nowrap">
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </span>
          </div>
        )}
      </div>

      {isCurrentUser && chatType === 'GROUP' && (
        <div className="bg-conveniat-green/10 mr-2 mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <UserCircle className="text-conveniat-green h-6 w-6" />
        </div>
      )}
    </div>
  );
};
