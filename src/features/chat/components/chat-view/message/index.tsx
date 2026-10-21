'use client';

import { avatarTextColorOf } from '@/components/ui/person-avatar';
import type { ChatMessage } from '@/features/chat/api/types';
import { AlertQuestionMessage } from '@/features/chat/components/chat-view/message/alert-question-message';
import { AlertResponseMessage } from '@/features/chat/components/chat-view/message/alert-response-message';
import { ChatImage } from '@/features/chat/components/chat-view/message/chat-image';
import { FailedMessageActions } from '@/features/chat/components/chat-view/message/failed-message-actions';
import { ImageMessage } from '@/features/chat/components/chat-view/message/image-message';
import { LocationMessage } from '@/features/chat/components/chat-view/message/location-message';
import { MessageFrame } from '@/features/chat/components/chat-view/message/message-frame';
import { MessageInfoDropdown } from '@/features/chat/components/chat-view/message/message-info-dropdown';
import {
  HoverToolbar,
  ReactionBadge,
  ReactionBar,
} from '@/features/chat/components/chat-view/message/message-reaction-menus';
import { ReactionDetailsDialog } from '@/features/chat/components/chat-view/message/reaction-details-dialog';
import { SenderAvatar } from '@/features/chat/components/chat-view/message/sender-avatar';
import { SystemMessage } from '@/features/chat/components/chat-view/message/system-message';
import { ThreadSummary } from '@/features/chat/components/chat-view/message/thread-summary';
import { extractMessageImages } from '@/features/chat/components/chat-view/message/utils/extract-message-images';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { DoubleCheck } from '@/features/chat/components/ui/double-check';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, Check, Clock } from 'lucide-react';
import React, { useRef, useState } from 'react';

const replyToMessageText: StaticTranslationString = {
  de: 'Antwort auf eine Nachricht',
  en: 'Replying to a message',
  fr: 'Répondre à un message',
};

const youText: StaticTranslationString = {
  de: 'Du',
  en: 'You',
  fr: 'Toi',
};

/** Rounder outside a run of bubbles, tighter where two bubbles of one sender meet. */
const bubbleCornerClassName = (
  isCurrentUser: boolean,
  isFirstInGroup: boolean,
  isLastInGroup: boolean,
): string => {
  if (isCurrentUser) {
    return cn(!isFirstInGroup && 'rounded-tr-[6px]', !isLastInGroup && 'rounded-br-[6px]');
  }
  return cn(!isFirstInGroup && 'rounded-tl-[6px]', !isLastInGroup && 'rounded-bl-[6px]');
};

const pendingOfflineText: StaticTranslationString = {
  de: 'Wird gesendet, sobald du wieder online bist',
  en: 'Will be sent as soon as you are back online',
  fr: 'Sera envoyé dès que vous serez de nouveau en ligne',
};

const sendingText: StaticTranslationString = {
  de: 'Wird gesendet',
  en: 'Sending',
  fr: 'Envoi en cours',
};

interface MessageProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  /** The sender's functions in the camp organisation, shown with their name; may be empty. */
  senderFunktionen?: string;
  /** The sender's profile picture, next to the block in a group chat. */
  senderPictureUrl?: string | undefined;
  chatType: string;
  hideReplyCount?: boolean;
  /** The message this one quotes, when it is loaded, for the name of its author. */
  quotedMessage?: ChatMessage | undefined;
  /** Opens a block of consecutive messages from one sender; only it shows the sender name. */
  isFirstInGroup?: boolean;
  /** Closes such a block; only it gets the bubble tail. */
  isLastInGroup?: boolean;
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
  senderFunktionen = '',
  senderPictureUrl,
  chatType,
  hideReplyCount = false,
  quotedMessage,
  isFirstInGroup = true,
  isLastInGroup = true,
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
  const attachedImages = extractMessageImages(message.messagePayload, activeLocale);
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
  const showMeta = isLastInGroup || message.sendFailed === true;
  const hasAvatarSlot =
    !isCurrentUser && chatType === 'GROUP' && typeof message.senderId === 'string';
  const isSelected = selectedMessage?.id === message.id;

  const [isHovered, setIsHovered] = useState(false);
  const [placeReactionsBelow, setPlaceReactionsBelow] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  // touch has no hover: a tap reveals the time of a bubble that does not show it
  const [isTimeRevealed, setIsTimeRevealed] = useState(false);
  const isTimeRevealedOrHovered = isHovered || isSelected || isTimeRevealed;

  const chatId = useChatId();
  const { data: chatDetails } = trpc.chat.chatDetails.useQuery({ chatId });
  const { data: currentUserId } = trpc.chat.user.useQuery({});

  const currentUserParticipant = chatDetails?.participants.find((p) => p.id === currentUserId);
  const isGuest = currentUserParticipant?.chatPermission === 'GUEST';
  const hasEmojiReactionCapability =
    chatDetails?.capabilities.includes(ChatCapability.EMOJI_REACTIONS) ?? false;
  const canReact = hasEmojiReactionCapability;
  const canThread = chatDetails?.capabilities.includes(ChatCapability.THREADS) ?? false;
  const canSendMessagesInChat =
    (chatDetails?.capabilities.includes(ChatCapability.CAN_SEND_MESSAGES) ?? true) &&
    chatDetails?.status !== ChatStatus.CLOSED;
  const hasThreadRepliesCapability =
    chatDetails?.capabilities.includes(ChatCapability.THREAD_REPLIES) ?? false;
  const isAllowedGuestThreadReplies =
    isGuest && !!activeThreadId && canThread && hasThreadRepliesCapability;

  const canSendMessages =
    !chatDetails?.archivedAt && canSendMessagesInChat && (!isGuest || isAllowedGuestThreadReplies);

  const toggleReactionMutation = trpc.chat.toggleReaction.useMutation({
    onError: (error) => {
      toast.error('Failed to react to message', error);
      console.error('Failed to react to message:', error);
    },
  });

  const reactedEmojis = new Set(
    (message.reactions ?? []).filter((r) => r.userId === currentUserId).map((r) => r.emoji),
  );

  const react = (emoji: string): void => {
    toggleReactionMutation.mutate({ messageId: message.id, emoji });
    if (isSelected) setSelectedMessage(undefined);
  };

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

  // Extract quotedMessageId and quoted Snippet from payload if present
  const payload = message.messagePayload as Record<string, unknown>;
  const quotedMessageId =
    typeof payload['quotedMessageId'] === 'string' ? payload['quotedMessageId'] : undefined;
  const quotedSnippet =
    typeof payload['quotedSnippet'] === 'string' ? payload['quotedSnippet'] : undefined;
  let quotedAuthor: string | undefined;
  if (quotedMessage === undefined) quotedAuthor = undefined;
  else if (quotedMessage.senderId === currentUserId) quotedAuthor = youText[activeLocale];
  else if (quotedMessage.senderName !== undefined)
    quotedAuthor = splitDisplayName(quotedMessage.senderName).primary;

  const selectThisMessage = (pressedElement: Element): void => {
    // no room above a bubble right under the header: open the reactions below it
    setPlaceReactionsBelow(pressedElement.getBoundingClientRect().top < 180);
    setSelectedMessage(message);
    setIsLongPressing(false);
  };

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

      const pressedElement = event.currentTarget;
      longPressTimerReference.current = setTimeout(() => {
        if ('vibrate' in navigator) navigator.vibrate(50);
        selectThisMessage(pressedElement);
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
    if (message.isPendingOffline) {
      return (
        <span title={pendingOfflineText[locale]}>
          <Clock className="ml-1 h-3.5 w-3.5 text-white/80" />
        </span>
      );
    }
    if (message.sendFailed === true) {
      return <AlertCircle className="ml-1 h-3.5 w-3.5 text-white" aria-hidden="true" />;
    }
    if (message.status === MessageEventType.CREATED || message.status === ('CREATED' as unknown)) {
      return (
        <span title={sendingText[locale]}>
          <Clock className="ml-1 h-3.5 w-3.5 text-white/80" />
        </span>
      );
    }
    // sent and delivered stay faint; read takes a colour of its own, so it shows at a glance
    switch (message.status) {
      case MessageEventType.STORED: {
        return <Check className="ml-1 h-3.5 w-3.5 text-white/60" strokeWidth={2.5} />;
      }
      case MessageEventType.RECEIVED: {
        return <DoubleCheck className="ml-1 text-white/60" />;
      }
      case MessageEventType.READ: {
        // 6:1 on the bubble, and a colour of its own beside the faint white of delivered
        return <DoubleCheck className="ml-1 text-emerald-200" />;
      }

      default: {
        return <></>;
      }
    }
  };

  if (message.type === MessageType.SYSTEM_MSG) {
    const owner = chatDetails?.participants.find(
      (participant) => participant.chatPermission === 'OWNER',
    );
    return (
      <SystemMessage
        message={message}
        creator={owner}
        currentUserId={currentUserId}
        isGroup={chatType === 'GROUP'}
      />
    );
  }

  const frameProperties = {
    message,
    isCurrentUser,
    senderFunktionen,
    locale: activeLocale,
  };

  if (message.type === MessageType.LOCATION_MSG) {
    return (
      <MessageFrame {...frameProperties}>
        <LocationMessage message={message} />
      </MessageFrame>
    );
  }

  if (message.type === ('ALERT_QUESTION' as unknown as MessageType)) {
    return (
      <MessageFrame {...frameProperties}>
        <AlertQuestionMessage message={message} isCurrentUser={isCurrentUser} />
      </MessageFrame>
    );
  }

  if (message.type === ('ALERT_RESPONSE' as unknown as MessageType)) {
    return (
      <MessageFrame {...frameProperties}>
        <AlertResponseMessage message={message} />
      </MessageFrame>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'group relative flex w-full items-end gap-2 transition-colors duration-200',
        isCurrentUser ? 'justify-end' : 'justify-start',
        isHighlighted && 'animate-message-highlight rounded-xl',
        isSelected && 'bg-tint',
        // the swipe transform makes every bubble its own stacking context, so the reaction
        // bar's z-index only counts inside this row; lift the row over its neighbours and
        // the sticky day divider, or the next bubble covers a bar opened below
        isSelected && 'z-30',
      )}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setIsHovered(true);
      }}
      onPointerLeave={() => setIsHovered(false)}
    >
      {hasAvatarSlot && typeof message.senderId === 'string' && (
        <div className="relative pl-2">
          <SenderAvatar
            senderId={message.senderId}
            name={message.senderName ?? ''}
            pictureUrl={senderPictureUrl}
            hidden={!isLastInGroup}
          />
          {/* the empty avatar slot is the one place a wide bubble leaves room for its time */}
          {!showMeta && isTimeRevealedOrHovered && (
            <span className="pointer-events-none absolute inset-y-0 right-0 left-2 flex items-center justify-center text-[11px] text-green-700">
              {formatMessageTimeOnlyRaw(message.createdAt, activeLocale)}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'relative flex max-w-[85%] flex-col',
          isCurrentUser ? 'items-end pr-2' : 'items-start',
          !isCurrentUser && chatType !== 'GROUP' && 'pl-2',
        )}
      >
        {!isCurrentUser && isFirstInGroup && chatType === 'GROUP' && message.senderName && (
          <span className="mb-1 max-w-full truncate px-1.5 text-[13px] text-green-700">
            <span className={cn('font-semibold', avatarTextColorOf(message.senderId ?? ''))}>
              {splitDisplayName(message.senderName).primary}
            </span>
            {senderFunktionen !== '' && ` · ${senderFunktionen}`}
          </span>
        )}
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(event) => {
            // a long press sends this too, on Android and in a desktop browser's touch mode: the
            // browser's own menu would open over the reactions. A right click opens them as well.
            event.preventDefault();
            if (isSelected) return;
            if (longPressTimerReference.current !== undefined) {
              clearTimeout(longPressTimerReference.current);
              longPressTimerReference.current = undefined;
            }
            selectThisMessage(event.currentTarget);
          }}
          style={{
            touchAction: 'pan-y', // Allow vertical scrolling
            transform: `translateX(${swipeX}px)`,
            transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          className="relative cursor-pointer select-none"
          onClick={(event) => {
            if (selectedMessage && selectedMessage.id !== message.id) {
              event.preventDefault();
              event.stopPropagation(); // Prevent opening thread or other click actions
              setSelectedMessage(message);
              return;
            }
            setIsTimeRevealed((revealed) => !revealed);
          }}
        >
          {isSelected && canReact && (
            <ReactionBar
              reactedEmojis={reactedEmojis}
              isCurrentUser={isCurrentUser}
              placeBelow={placeReactionsBelow}
              locale={activeLocale}
              onReact={react}
            />
          )}
          {isHovered && selectedMessage === undefined && (
            <HoverToolbar
              reactedEmojis={reactedEmojis}
              isCurrentUser={isCurrentUser}
              canReact={canReact}
              canQuote={canSendMessages}
              canThread={canThread}
              locale={activeLocale}
              onReact={react}
              onQuote={() => quoteMessage(message.id)}
              onThread={() => replyInThread(message.id)}
              onInfo={() => setShowInfo(true)}
            />
          )}
          <div
            className={cn(
              'relative rounded-[16px] px-3.5 py-2 transition-transform duration-150',
              // `anywhere`, not `break-word`: only it lowers the min-content width, so a long URL
              // wraps inside the bubble instead of stretching it past the screen edge
              'max-w-full min-w-[64px] wrap-anywhere',
              isCurrentUser
                ? 'bg-conveniat-green text-white'
                : 'border-line border bg-white text-green-900',
              bubbleCornerClassName(isCurrentUser, isFirstInGroup, isLastInGroup),
              // pending shows as a quieter bubble and a clock, never a spinner
              message.status === MessageEventType.CREATED &&
                message.sendFailed !== true &&
                'opacity-80',
              message.sendFailed === true && 'ring-danger ring-2',
              (isLongPressing || isSelected) && 'scale-[0.98]',
              isSelected && 'ring-conveniat-green/30 ring-2',
            )}
          >
            {/* Quoted message preview */}
            {quotedMessageId && (
              <button
                type="button"
                onClick={(event_) => {
                  event_.stopPropagation();
                  scrollToMessage(quotedMessageId);
                }}
                className={cn(
                  'relative mt-0.5 mb-2 block w-full cursor-pointer rounded-[8px] border-l-[3px] py-1.5 pr-2 pl-2.5 text-left transition-colors',
                  // brand green on the white bubble; on the green one a white bar and white text,
                  // both above 4.5:1 on the lightened green
                  isCurrentUser
                    ? 'border-white bg-white/15 text-white'
                    : 'border-conveniat-green bg-quiet text-green-700',
                )}
              >
                {quotedAuthor !== undefined && (
                  <span
                    className={cn(
                      'block truncate text-[13px] leading-snug font-semibold',
                      isCurrentUser ? 'text-white' : 'text-green-900',
                    )}
                  >
                    {quotedAuthor}
                  </span>
                )}
                <span className="line-clamp-2 text-[13px] leading-snug">
                  {typeof quotedSnippet === 'string' && quotedSnippet.length > 0
                    ? quotedSnippet
                    : replyToMessageText[activeLocale]}
                </span>
              </button>
            )}
            {message.type === MessageType.IMAGE_MSG ? (
              <div className={cn(showMeta && 'pb-4')}>
                <ImageMessage message={message} />
              </div>
            ) : (
              <>
                {attachedImages.length > 0 && (
                  <div className="mb-2 flex flex-col gap-2">
                    {attachedImages.map((image) => (
                      <ChatImage
                        key={image.url}
                        url={image.url}
                        alt={image.alt}
                        caption={image.caption}
                      />
                    ))}
                  </div>
                )}
                <div className="text-[15px] leading-[21px]">
                  {renderedContent}
                  {/* keeps the end of the last line free for the time, which sits on it, or
                      moves to a line of its own when the text runs to the edge */}
                  {showMeta && (
                    <span
                      aria-hidden="true"
                      className={cn('inline-block h-px', isCurrentUser ? 'w-[60px]' : 'w-[40px]')}
                    />
                  )}
                </div>
              </>
            )}
            {/* Timestamp and status: in the bubble for the last of a block, beside it on demand
                for the others, so revealing it never changes the height of the list */}
            {showMeta ? (
              <div
                className={cn(
                  'absolute right-3 bottom-[7px] flex items-center gap-1 text-[11px] leading-none',
                  // 4.5:1 on both bubbles: white over the green, the secondary text on white
                  isCurrentUser ? 'text-white/85' : 'text-green-700',
                )}
              >
                <span className="tabular-nums">
                  {formatMessageTimeOnlyRaw(message.createdAt, activeLocale)}
                </span>
                {renderMessageStatus()}
              </div>
            ) : (
              isTimeRevealedOrHovered &&
              !hasAvatarSlot && (
                <span
                  className={cn(
                    'pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center text-[11px] whitespace-nowrap text-green-700',
                    isCurrentUser ? 'right-full mr-2' : 'left-full ml-2',
                  )}
                >
                  {formatMessageTimeOnlyRaw(message.createdAt, activeLocale)}
                </span>
              )
            )}
          </div>

          {/* Reactions Badges */}
          {groupedReactions.length > 0 && (
            <div
              // over the foot of the bubble, so they read as its own
              className={cn(
                'relative z-10 -mt-1.5 flex flex-wrap gap-1 px-2',
                isCurrentUser ? 'justify-end' : 'justify-start',
              )}
            >
              {groupedReactions.map((group) => (
                <ReactionBadge
                  key={group.emoji}
                  emoji={group.emoji}
                  userNames={group.users.map((u) => u.name)}
                  hasReacted={group.users.some((u) => u.id === currentUserId)}
                  canReact={canReact}
                  locale={activeLocale}
                  onToggle={() =>
                    toggleReactionMutation.mutate({ messageId: message.id, emoji: group.emoji })
                  }
                  onShowReactors={() => setShowReactors(true)}
                />
              ))}
            </div>
          )}
        </div>

        {message.sendFailed === true && (
          <FailedMessageActions message={message} locale={activeLocale} />
        )}

        {/* the thread hangs on its message, not between it and the next one */}
        {!hideReplyCount && message.replyCount !== undefined && message.replyCount > 0 && (
          <ThreadSummary
            message={message}
            replyCount={message.replyCount}
            hasUnreadReplies={message.hasUnreadReplies === true && activeThreadId !== message.id}
            locale={activeLocale}
            onOpen={() => replyInThread(message.id)}
          />
        )}
      </div>

      {showReactors && (
        <ReactionDetailsDialog
          groups={groupedReactions}
          currentUserId={currentUserId}
          locale={activeLocale}
          onClose={() => setShowReactors(false)}
        />
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
