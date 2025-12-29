'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ChatMessage } from '@/features/chat/api/types';
import { AlertQuestionMessage } from '@/features/chat/components/chat-view/message/alert-question-message';
import { AlertResponseMessage } from '@/features/chat/components/chat-view/message/alert-response-message';
import { ImageMessage } from '@/features/chat/components/chat-view/message/image-message';
import { LocationMessage } from '@/features/chat/components/chat-view/message/location-message';
import { MessageInfoDropdown } from '@/features/chat/components/chat-view/message/message-info-dropdown';
import { SystemMessage } from '@/features/chat/components/chat-view/message/system-message';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import { ChatCapability } from '@/lib/chat-shared';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Loader2, MessageSquare, MoreHorizontal, Quote, UserCircle } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useRef, useState } from 'react';

const DoubleCheck: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('relative flex h-2 w-4.5 items-center', className)}>
    <Check className="absolute left-0 h-2 w-2" />
    <Check className="absolute left-1.5 h-2 w-2" />
  </div>
);

const replyInThreadText: StaticTranslationString = {
  de: 'Im Thread antworten',
  en: 'Reply in thread',
  fr: 'Répondre dans le fil',
};

const quoteText: StaticTranslationString = {
  de: 'Zitieren',
  en: 'Quote',
  fr: 'Citer',
};

const messageInfoText: StaticTranslationString = {
  de: 'Nachrichten-Details',
  en: 'Message Info',
  fr: 'Infos message',
};

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
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [showInfo, setShowInfo] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const isTouchReference = useRef(false);
  const longPressTimerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { formatMessageTimeOnly } = useFormatDate();
  const renderedContent = formatMessageContent(message.messagePayload, locale);
  const chatId = useChatId();
  const { data: chatDetails } = useChatDetail(chatId);
  const { replyInThread, quoteMessage, scrollToMessage, highlightedMessageId, activeThreadId } =
    useChatActions();
  const isHighlighted = highlightedMessageId === message.id;

  const canThread =
    chatDetails?.capabilities.find((c) => String(c.capability) === String(ChatCapability.THREADS))
      ?.isEnabled ?? true;

  // Extract quotedMessageId and quotedSnippet from payload if present
  const payload = message.messagePayload as Record<string, unknown>;
  const quotedMessageId =
    typeof payload['quotedMessageId'] === 'string' ? payload['quotedMessageId'] : undefined;
  const quotedSnippet =
    typeof payload['quotedSnippet'] === 'string' ? payload['quotedSnippet'] : undefined;

  const handleInteraction = (event: React.MouseEvent | React.TouchEvent): void => {
    event.preventDefault();
    setShowInfo((previous) => !previous);
  };

  const handleTouchStart = (event: React.TouchEvent): void => {
    isTouchReference.current = true;
    event.stopPropagation();
    const touch = event.touches[0];
    if (touch) touchStartX.current = touch.clientX;
    setIsLongPressing(true);
    longPressTimerReference.current = setTimeout(() => {
      console.log('Long press triggered', { messageId: message.id });
      // Trigger haptic feedback if available - Aligned with 2s trigger
      if ('vibrate' in navigator) navigator.vibrate(50);
      setShowInfo(true);
      setIsLongPressing(false);
    }, 2000); // 2000ms (2s) for long press
  };

  const handleTouchEnd = (): void => {
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

  const handleTouchMove = (event: React.TouchEvent): void => {
    const touch = event.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartX.current;
    // Only allow right swipe, cap at 80px
    const newSwipeX = Math.max(0, Math.min(deltaX, 80));
    setSwipeX(newSwipeX);

    // Cancel long-press if user is swiping
    if (newSwipeX > 10 && longPressTimerReference.current) {
      clearTimeout(longPressTimerReference.current);
      longPressTimerReference.current = undefined;
      setIsLongPressing(false);
    }
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
        'group flex w-full items-end gap-2',
        isCurrentUser ? 'justify-end' : 'justify-start',
        isHighlighted && 'animate-message-highlight rounded-xl',
      )}
    >
      {!isCurrentUser && chatType === 'GROUP' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <UserCircle className="h-6 w-6 text-gray-400" />
        </div>
      )}

      <div className={cn('flex max-w-[85%] flex-col', isCurrentUser ? 'items-end' : 'items-start')}>
        <DropdownMenu
          open={showInfo}
          onOpenChange={(open) => {
            console.log('DropdownMenu onOpenChange', { open, messageId: message.id });
            setShowInfo(open);
          }}
        >
          <DropdownMenuTrigger asChild onPointerDown={(event) => event.preventDefault()}>
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onClick={(event_) => {
                // Aggressively block all clicks to ensure only 2s long press works
                event_.preventDefault();
                event_.stopPropagation();
                console.log('Blocked click trigger on message bubble', { messageId: message.id });
              }}
              onMouseDown={() => {
                isTouchReference.current = false;
              }}
              onContextMenu={handleInteraction}
              style={{
                touchAction: 'none',
                transform: `translateX(${swipeX}px)`,
                transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
              }}
              className="cursor-pointer touch-none select-none"
            >
              <div
                className={cn(
                  'font-body relative rounded-[18px] px-4 pt-3 pb-6 shadow-sm transition-transform duration-150',
                  // Ensure minimum width for short messages to accommodate timestamp
                  'min-w-[120px]',
                  isCurrentUser
                    ? 'bg-cevi-blue rounded-br-md text-white'
                    : 'rounded-bl-md border border-gray-200 bg-white text-gray-900',
                  message.status === MessageEventType.CREATED && 'opacity-60',
                  isLongPressing && 'scale-95',
                )}
                style={{
                  overflowWrap: 'break-word',
                }}
              >
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
                    'absolute bottom-1.5 right-3 inline-flex items-center gap-0.5 text-[10px]',
                    isCurrentUser ? 'text-white/70' : 'text-gray-400',
                  )}
                >
                  <span className="font-body">{formatMessageTimeOnly(message.createdAt)}</span>
                  {renderMessageStatus()}
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isCurrentUser ? 'end' : 'start'}
            className="z-[9999] min-w-[150px] border-gray-200 bg-white shadow-xl"
            sideOffset={8}
          >
            {canThread && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setShowInfo(false);
                  replyInThread(message.id);
                }}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {replyInThreadText[locale]}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                setShowInfo(false);
                quoteMessage(message.id);
              }}
            >
              <Quote className="mr-2 h-4 w-4" />
              {quoteText[locale]}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                setShowInfo(false);
                setShowInfoDialog(true);
              }}
            >
              <MoreHorizontal className="mr-2 h-4 w-4" />
              {messageInfoText[locale]}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
        <div className="bg-conveniat-green/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <UserCircle className="text-conveniat-green h-6 w-6" />
        </div>
      )}

      {showInfoDialog && (
        <MessageInfoDropdown
          message={message}
          isCurrentUser={isCurrentUser}
          onClose={() => setShowInfoDialog(false)}
        />
      )}
    </div>
  );
};
