'use client';

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
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import { ChatCapability } from '@/lib/chat-shared';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Info, Loader2, MessageSquare, Quote, UserCircle } from 'lucide-react';
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

const repliesCountText: (count: number, locale: Locale) => string = (count, locale) => {
  if (count === 1) {
    if (locale === 'de') return '1 Antwort';
    if (locale === 'fr') return '1 réponse';
    return '1 reply';
  }
  if (locale === 'de') return `${count} Antworten`;
  if (locale === 'fr') return `${count} réponses`;
  return `${count} replies`;
};

const clickToRemoveText: StaticTranslationString = {
  de: 'Klicken zum Entfernen',
  en: 'Click to remove',
  fr: 'Cliquer pour supprimer',
};

const emojiNames: Record<string, StaticTranslationString> = {
  '👍': { de: 'Gefällt mir', en: 'Like', fr: "J'aime" },
  '👎': { de: 'Gefällt mir nicht', en: 'Dislike', fr: "Je n'aime pas" },
  '❤️': { de: 'Liebe', en: 'Love', fr: 'Amour' },
  '😂': { de: 'Lachen', en: 'Laugh', fr: 'Rire' },
  '😮': { de: 'Staunen', en: 'Wow', fr: 'Surpris' },
  '😢': { de: 'Traurig', en: 'Sad', fr: 'Triste' },
  '🙏': { de: 'Bitte / Danke', en: 'Please / Thank you', fr: "S'il vous plaît / Merci" },
  '🎉': { de: 'Feiern', en: 'Celebrate', fr: 'Célébrer' },
};

const quoteText: StaticTranslationString = {
  de: 'Zitieren',
  en: 'Quote',
  fr: 'Citer',
};

const replyText: StaticTranslationString = {
  de: 'Im Thread antworten',
  en: 'Reply in Thread',
  fr: 'Répondre dans le fil',
};

const infoText: StaticTranslationString = {
  de: 'Info',
  en: 'Message Info',
  fr: 'Infos message',
};

interface MessageProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  chatType: string;
  hideReplyCount?: boolean;
  isThreadRoot?: boolean;
  locale: Locale;
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
  locale,
}) => {
  const activeLocale = locale;
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const isPointerDown = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const renderedContent = formatMessageContent(message.messagePayload, activeLocale);
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

  const [isHovered, setIsHovered] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const chatId = useChatId();
  const { data: chatDetails } = trpc.chat.chatDetails.useQuery({ chatId });
  const { data: currentUserId } = trpc.chat.user.useQuery({});

  const currentUserParticipant = chatDetails?.participants.find((p) => p.id === currentUserId);
  const isGuest = currentUserParticipant?.chatPermission === 'GUEST';
  const hasEmojiReactionCapability =
    chatDetails?.capabilities.includes(ChatCapability.EMOJI_REACTIONS) ?? false;
  const canReact = !isGuest || hasEmojiReactionCapability;
  const canThread = chatDetails?.capabilities.includes(ChatCapability.THREADS) ?? false;
  const canSendMessagesInChat =
    chatDetails?.capabilities.includes(ChatCapability.CAN_SEND_MESSAGES) ?? true;
  const hasThreadRepliesCapability =
    chatDetails?.capabilities.includes(ChatCapability.THREAD_REPLIES) ?? false;
  const isAllowedGuestThreadReplies =
    isGuest && !!activeThreadId && canThread && hasThreadRepliesCapability;

  const canSendMessages =
    !chatDetails?.isArchived && canSendMessagesInChat && (!isGuest || isAllowedGuestThreadReplies);

  const toggleReactionMutation = trpc.chat.toggleReaction.useMutation({
    onError: (error) => {
      toast.error('Failed to react to message', error);
      console.error('Failed to react to message:', error);
    },
  });

  const groupedReactions = React.useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return [];

    const groups: Record<string, { emoji: string; users: { id: string; name: string }[] }> = {};
    for (const r of message.reactions) {
      let group = groups[r.emoji];
      if (!group) {
        group = { emoji: r.emoji, users: [] };
        groups[r.emoji] = group;
      }
      group.users.push({ id: r.userId, name: r.userName });
    }
    return Object.values(groups);
  }, [message.reactions]);

  const QUICK_EMOJIS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🙏', '🎉'];

  // Extract quotedMessageId and quoted Snippet from payload if present
  const payload = message.messagePayload as Record<string, unknown>;
  const quotedMessageId =
    typeof payload['quotedMessageId'] === 'string' ? payload['quotedMessageId'] : undefined;
  const quotedSnippet =
    typeof payload['quotedSnippet'] === 'string' ? payload['quotedSnippet'] : undefined;

  const handlePointerDown = (event: React.PointerEvent): void => {
    // Only handle primary button
    if (event.button !== 0) return;

    // Check pointer type to only run long press on touch devices
    if (event.pointerType === 'touch') {
      isPointerDown.current = true;
      touchStartX.current = event.clientX;
      touchStartY.current = event.clientY;
      setIsLongPressing(true);

      // Capture the pointer to ensure we receive events even if the pointer leaves the element
      event.currentTarget.setPointerCapture(event.pointerId);

      longPressTimerReference.current = setTimeout(() => {
        console.log('Long press triggered', { messageId: message.id });
        if ('vibrate' in navigator) navigator.vibrate(50);
        setSelectedMessage(message);
        setIsLongPressing(false);
        longPressTimerReference.current = undefined;
      }, 500); // 500ms for long press selection
    }
  };

  const handlePointerUp = (event: React.PointerEvent): void => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;

    // Release the pointer capture
    event.currentTarget.releasePointerCapture(event.pointerId);
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
    if (!isPointerDown.current) return;

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

  const handlePointerCancel = (event: React.PointerEvent): void => {
    if (longPressTimerReference.current) {
      clearTimeout(longPressTimerReference.current);
      longPressTimerReference.current = undefined;
    }
    isPointerDown.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
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
        isSelected && (isCurrentUser ? 'bg-blue-50' : 'bg-gray-50'),
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isCurrentUser && chatType === 'GROUP' && (
        <div className="mb-1 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white bg-linear-to-br from-gray-100 to-gray-200 shadow-sm">
          <UserCircle className="h-5 w-5 text-gray-500" />
        </div>
      )}

      <div
        className={cn(
          'relative flex max-w-[85%] flex-col py-1',
          isCurrentUser ? 'items-end pr-2' : 'items-start pl-2',
        )}
      >
        {/* Floating Action Menu */}
        {(isHovered || isSelected) && (
          <div
            style={{ borderColor: '#E6E6E7' }}
            className={cn(
              'absolute z-30 flex items-center gap-1 rounded-full border bg-white p-1 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),_0_8px_10px_-6px_rgba(0,0,0,0.05)] transition-all duration-200',
              'animate-in fade-in zoom-in-95 duration-100',
              isCurrentUser ? '-top-10 right-2' : '-top-10 left-2',
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Quick Reactions */}
            {canReact && (
              <>
                <div className="flex items-center gap-0.5 px-1">
                  {QUICK_EMOJIS.map((emoji) => {
                    const userReaction = message.reactions?.find(
                      (r) => r.emoji === emoji && r.userId === currentUserId,
                    );
                    const hasReacted = !!userReaction;

                    return (
                      <button
                        key={emoji}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleReactionMutation.mutate({ messageId: message.id, emoji });
                          if (isSelected) {
                            setSelectedMessage(undefined);
                          }
                        }}
                        className={cn(
                          'flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-md text-base transition-all duration-150 focus:outline-none focus-visible:bg-gray-100 active:scale-125',
                          hasReacted
                            ? 'scale-110 border border-blue-100 bg-blue-50 text-blue-600'
                            : 'hover:scale-120 hover:bg-gray-100',
                        )}
                        title={emojiNames[emoji]?.[activeLocale] || ''}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                {/* Divider */}
                <div className="h-4 w-[1px] bg-gray-100" />
              </>
            )}

            {/* Actions */}
            <div className="flex items-center gap-0.5 px-1">
              {/* Quote Action */}
              <button
                disabled={!canSendMessages}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  quoteMessage(message.id);
                  if (isSelected) {
                    setSelectedMessage(undefined);
                  }
                }}
                className={cn(
                  'flex h-7.5 w-7.5 items-center justify-center rounded-md text-gray-400 transition-all duration-150 focus:outline-none focus-visible:bg-gray-100',
                  canSendMessages
                    ? 'cursor-pointer hover:scale-110 hover:bg-gray-100 hover:text-gray-700 active:scale-95'
                    : 'cursor-not-allowed opacity-35',
                )}
                title={canSendMessages ? quoteText[activeLocale] : undefined}
              >
                <Quote className="h-4 w-4" />
              </button>

              {/* Thread Reply Action */}
              {canThread && (
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    replyInThread(message.id);
                    if (isSelected) {
                      setSelectedMessage(undefined);
                    }
                  }}
                  className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-all duration-150 hover:scale-110 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:bg-gray-100 active:scale-95"
                  title={replyText[activeLocale]}
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              )}

              {/* Message Info Action */}
              <button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowInfo(true);
                }}
                className="flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-all duration-150 hover:scale-110 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:bg-gray-100 active:scale-95"
                title={infoText[activeLocale]}
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {!isCurrentUser && message.senderName && (
          <span className="mb-1 px-1.5 text-xs font-semibold text-gray-500">
            {message.senderName}
          </span>
        )}
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
          onClick={(event) => {
            if (selectedMessage && selectedMessage.id !== message.id) {
              event.preventDefault();
              event.stopPropagation(); // Prevent opening thread or other click actions
              setSelectedMessage(message);
            }
          }}
        >
          <div
            className={cn(
              'font-body relative rounded-2xl px-4 py-2.5 shadow-sm transition-transform duration-150',
              'max-w-full min-w-[100px]',
              isCurrentUser
                ? 'bg-cevi-blue rounded-br-[4px] text-white'
                : 'rounded-bl-[4px] border border-gray-100 bg-white text-gray-800',
              message.status === MessageEventType.CREATED &&
                'bg-cevi-blue/80 animate-pulse text-white/90',
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
                    : 'border-blue-300 bg-gray-50 text-gray-500',
                )}
              >
                <span className="line-clamp-2 text-[0.8rem] leading-snug">
                  {typeof quotedSnippet === 'string' && quotedSnippet.length > 0
                    ? quotedSnippet
                    : replyToMessageText[activeLocale]}
                </span>
              </div>
            )}
            {message.type === MessageType.IMAGE_MSG ? (
              <div className="mb-2">
                <ImageMessage message={message} />
              </div>
            ) : (
              <div className="text-[0.95rem] leading-relaxed">{renderedContent}</div>
            )}
            {/* Timestamp and status */}
            <div
              className={cn(
                'mt-1 flex items-center justify-end gap-1 text-[10px]',
                isCurrentUser ? 'text-white/80' : 'text-gray-400',
              )}
            >
              <span className="font-body">
                {formatMessageTimeOnlyRaw(message.createdAt, activeLocale)}
              </span>
              {renderMessageStatus()}
            </div>
          </div>

          {/* Reactions Badges */}
          {groupedReactions.length > 0 && (
            <div
              className={cn(
                'mt-1.5 flex flex-wrap gap-1',
                isCurrentUser ? 'justify-end' : 'justify-start',
              )}
            >
              {groupedReactions.map((group) => {
                const hasReacted = group.users.some((u) => u.id === currentUserId);
                const userListNames = group.users.map((u) => u.name).join(', ');

                return (
                  <button
                    key={group.emoji}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (canReact) {
                        toggleReactionMutation.mutate({
                          messageId: message.id,
                          emoji: group.emoji,
                        });
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all duration-150 hover:scale-105 focus:outline-none active:scale-95',
                      hasReacted
                        ? 'border-blue-200 bg-blue-50 text-blue-600 hover:border-red-200 hover:bg-red-50 hover:text-red-500'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100',
                    )}
                    title={
                      hasReacted
                        ? `${userListNames ? userListNames + '\n' : ''}(${clickToRemoveText[activeLocale]})`
                        : userListNames
                    }
                  >
                    <span>{group.emoji}</span>
                    <span className="font-semibold">{group.users.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Thread Reply Count Indicator (Below Bubble) */}
        {!hideReplyCount && message.replyCount !== undefined && message.replyCount > 0 && (
          <div
            className={cn(
              'relative mt-1 flex cursor-pointer items-center gap-2 py-0.5 transition-opacity hover:opacity-85',
              isCurrentUser ? 'justify-end pr-2' : 'justify-start pl-8',
            )}
            onClick={(event_) => {
              event_.preventDefault();
              event_.stopPropagation();
              replyInThread(message.id);
            }}
          >
            {/* Curved connection line for incoming messages */}
            {!isCurrentUser && (
              <div className="border-l-1.5 border-b-1.5 absolute -top-2 left-3.5 h-5 w-3.5 rounded-bl-md border-gray-300" />
            )}

            <div className="text-cevi-blue relative flex items-center gap-1.5 text-xs font-semibold hover:text-blue-700">
              <MessageSquare className="h-3.5 w-3.5" />
              {message.hasUnreadReplies && activeThreadId !== message.id && (
                <span className="absolute -top-1 -left-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
              )}
              <span className="whitespace-nowrap">
                {repliesCountText(message.replyCount, activeLocale)}
              </span>
            </div>
          </div>
        )}
      </div>

      {isCurrentUser && chatType === 'GROUP' && (
        <div className="mr-2 mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
          <UserCircle className="text-conveniat-green h-5 w-5" />
        </div>
      )}

      {showInfo && (
        <MessageInfoDropdown
          message={message}
          isCurrentUser={isCurrentUser}
          onClose={() => {
            setShowInfo(false);
            if (isSelected) {
              setSelectedMessage(undefined);
            }
          }}
        />
      )}
    </div>
  );
};
