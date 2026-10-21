'use client';

import { avatarTextColorOf } from '@/components/ui/person-avatar';
import type { ChatMessage } from '@/features/chat/api/types';
import { AlertQuestionMessage } from '@/features/chat/components/chat-view/message/alert-question-message';
import { AlertResponseMessage } from '@/features/chat/components/chat-view/message/alert-response-message';
import { ChatImage } from '@/features/chat/components/chat-view/message/chat-image';
import { FailedMessageActions } from '@/features/chat/components/chat-view/message/failed-message-actions';
import { ImageMessage } from '@/features/chat/components/chat-view/message/image-message';
import { LocationMessage } from '@/features/chat/components/chat-view/message/location-message';
import { MessageActionsSheet } from '@/features/chat/components/chat-view/message/message-actions-sheet';
import { MessageFrame } from '@/features/chat/components/chat-view/message/message-frame';
import { ReactionBadge } from '@/features/chat/components/chat-view/message/message-reaction-menus';
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
import { useLongPress } from '@/features/chat/hooks/use-long-press';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, Check, Clock, Ellipsis } from 'lucide-react';
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

const messageActionsText: StaticTranslationString = {
  de: 'Aktionen zur Nachricht',
  en: 'Message actions',
  fr: 'Actions du message',
};

/** How far a finger swipes a bubble to the right before letting go quotes it. */
const SWIPE_TO_QUOTE_PX = 60;
const SWIPE_MAX_PX = 80;
/** Past this, the finger is scrolling or swiping, and the bubble stops looking pressed. */
const PRESS_TOLERANCE_PX = 10;

/** The text of a message, for the clipboard; undefined where there is none, as on an image. */
const textOf = (payload: ChatMessage['messagePayload']): string | undefined => {
  const text: unknown =
    typeof payload === 'string' ? payload : (payload as Record<string, unknown>)['text'];
  return typeof text === 'string' && text.trim() !== '' ? text : undefined;
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
  const [isPressing, setIsPressing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | undefined>(undefined);
  const bubbleReference = useRef<HTMLDivElement>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const renderedContent = formatMessageContent(message.messagePayload, activeLocale);
  const attachedImages = extractMessageImages(message.messagePayload, activeLocale);
  const { replyInThread, quoteMessage, scrollToMessage, highlightedMessageId, activeThreadId } =
    useChatActions();
  const isHighlighted = highlightedMessageId === message.id;
  const showMeta = isLastInGroup || message.sendFailed === true;
  const hasAvatarSlot =
    !isCurrentUser && chatType === 'GROUP' && typeof message.senderId === 'string';

  const [isHovered, setIsHovered] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  // touch has no hover: a tap reveals the time of a bubble that does not show it
  const [isTimeRevealed, setIsTimeRevealed] = useState(false);
  const isTimeRevealedOrHovered = isHovered || isTimeRevealed;

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

  const openActions = (): void => {
    // the finger that held the bubble may still move; that is no swipe any more
    swipeStart.current = undefined;
    setIsPressing(false);
    setSwipeX(0);
    // the sheet hands focus back to what had it, and a long press focuses nothing
    bubbleReference.current?.focus({ preventScroll: true });
    setIsActionsOpen(true);
  };
  const longPress = useLongPress(openActions);

  const handlePointerDown = (event: React.PointerEvent): void => {
    longPress.onPointerDown(event);
    if (event.pointerType !== 'touch' || event.button !== 0) return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
    setIsPressing(true);
  };

  const handlePointerMove = (event: React.PointerEvent): void => {
    longPress.onPointerMove(event);
    if (swipeStart.current === undefined) return;
    const deltaX = event.clientX - swipeStart.current.x;
    const deltaY = event.clientY - swipeStart.current.y;
    if (Math.abs(deltaX) > PRESS_TOLERANCE_PX || Math.abs(deltaY) > PRESS_TOLERANCE_PX) {
      setIsPressing(false);
    }
    // only to the right; a vertical drag is the browser's scroll (`pan-y`), which cancels this
    setSwipeX(Math.max(0, Math.min(deltaX, SWIPE_MAX_PX)));
  };

  const handlePointerUp = (): void => {
    longPress.onPointerUp();
    if (swipeStart.current === undefined) return;
    swipeStart.current = undefined;
    setIsPressing(false);
    if (swipeX > SWIPE_TO_QUOTE_PX && canSendMessages) {
      if (typeof navigator.vibrate === 'function') navigator.vibrate(30);
      quoteMessage(message.id);
    }
    setSwipeX(0);
  };

  const handlePointerCancel = (): void => {
    longPress.onPointerCancel();
    swipeStart.current = undefined;
    setIsPressing(false);
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

  // a message the server has not stored yet has nothing to react or reply to
  const isSent =
    message.sendFailed !== true &&
    message.isPendingOffline !== true &&
    message.status !== MessageEventType.CREATED;
  const bubbleColorClassName = isCurrentUser
    ? 'bg-conveniat-green text-white'
    : 'border-line border bg-white text-green-900';
  // what this message answers; it scrolls there
  const quoteBlock = quotedMessageId !== undefined && (
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
  );
  // the bubble's content without its time, for the top of the actions sheet
  const bubbleBody = (
    <>
      {quoteBlock}
      {message.type === MessageType.IMAGE_MSG ? (
        <ImageMessage message={message} />
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
          <div className="text-[15px] leading-[21px]">{renderedContent}</div>
        </>
      )}
    </>
  );

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'group relative flex w-full items-end gap-2 transition-colors duration-200',
        isCurrentUser ? 'justify-end' : 'justify-start',
        isHighlighted && 'animate-message-highlight rounded-xl',
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
        {/* a long press, a right click or the context-menu key opens the message's actions */}
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={longPress.onPointerLeave}
          onContextMenu={longPress.onContextMenu}
          onKeyDown={longPress.onKeyDown}
          onClickCapture={longPress.onClickCapture}
          style={{
            touchAction: 'pan-y', // Allow vertical scrolling
            transform: `translateX(${swipeX}px)`,
            transition: swipeX === 0 ? 'transform 0.2s ease-out' : 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          className="relative cursor-pointer select-none"
          onClick={() => setIsTimeRevealed((revealed) => !revealed)}
        >
          <div
            ref={bubbleReference}
            // reachable by keyboard for the context-menu key, and where focus returns from the sheet
            tabIndex={0}
            className={cn(
              'relative rounded-[16px] px-3.5 py-2 transition-transform duration-150',
              // `anywhere`, not `break-word`: only it lowers the min-content width, so a long URL
              // wraps inside the bubble instead of stretching it past the screen edge
              'max-w-full min-w-[64px] wrap-anywhere',
              bubbleColorClassName,
              bubbleCornerClassName(isCurrentUser, isFirstInGroup, isLastInGroup),
              // pending shows as a quieter bubble and a clock, never a spinner
              message.status === MessageEventType.CREATED &&
                message.sendFailed !== true &&
                'opacity-80',
              message.sendFailed === true && 'ring-danger ring-2',
              isPressing && 'scale-[0.98]',
            )}
          >
            {quoteBlock}
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
            ) : undefined}
            {/* beside the bubble, towards the middle: the time where the bubble does not show it,
                and under a mouse the way to the actions a finger reaches by holding the bubble */}
            {isTimeRevealedOrHovered && (
              <div
                className={cn(
                  'absolute top-1/2 flex -translate-y-1/2 items-center gap-1',
                  isCurrentUser ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2',
                )}
              >
                {!showMeta && !hasAvatarSlot && (
                  <span className="pointer-events-none text-[11px] whitespace-nowrap text-green-700">
                    {formatMessageTimeOnlyRaw(message.createdAt, activeLocale)}
                  </span>
                )}
                {isHovered && (
                  <button
                    type="button"
                    onClick={(event) => {
                      // the bubble would otherwise toggle its time
                      event.stopPropagation();
                      openActions();
                    }}
                    aria-label={messageActionsText[activeLocale]}
                    title={messageActionsText[activeLocale]}
                    className="hover:bg-quiet flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-green-700 hover:text-green-900"
                  >
                    <Ellipsis className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
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

      {isActionsOpen && (
        <MessageActionsSheet
          message={message}
          isCurrentUser={isCurrentUser}
          locale={activeLocale}
          preview={
            <div
              inert
              className={cn(
                'max-h-[35dvh] max-w-[85%] min-w-[64px] overflow-hidden rounded-[16px] px-3.5 py-2 wrap-anywhere',
                bubbleColorClassName,
              )}
            >
              {bubbleBody}
            </div>
          }
          onClose={() => setIsActionsOpen(false)}
          reactions={canReact && isSent ? { reactedEmojis, onReact: react } : undefined}
          onReply={canSendMessages && isSent ? (): void => quoteMessage(message.id) : undefined}
          onReplyInThread={
            canThread && isSent && activeThreadId !== message.id
              ? (): void => replyInThread(message.id)
              : undefined
          }
          textToCopy={textOf(message.messagePayload)}
        />
      )}
    </div>
  );
};
