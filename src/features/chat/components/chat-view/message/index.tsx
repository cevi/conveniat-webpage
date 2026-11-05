'use client';

import { avatarTextColorOf } from '@/components/ui/person-avatar';
import { toast } from '@/components/ui/toast';
import type { ChatMessage } from '@/features/chat/api/types';
import { AlertQuestionMessage } from '@/features/chat/components/chat-view/message/alert-question-message';
import { AlertResponseMessage } from '@/features/chat/components/chat-view/message/alert-response-message';
import { FailedMessageActions } from '@/features/chat/components/chat-view/message/failed-message-actions';
import { LocationMessage } from '@/features/chat/components/chat-view/message/location-message';
import { MessageActionsSheet } from '@/features/chat/components/chat-view/message/message-actions-sheet';
import {
  bubbleColorClassName,
  bubbleCornerClassName,
  MessageBubble,
  MessageBubbleContent,
  MessageRow,
} from '@/features/chat/components/chat-view/message/message-bubble';
import { MessageFrame } from '@/features/chat/components/chat-view/message/message-frame';
import { ReactionBadge } from '@/features/chat/components/chat-view/message/message-reaction-menus';
import { ReactionDetailsDialog } from '@/features/chat/components/chat-view/message/reaction-details-dialog';
import { SenderAvatar } from '@/features/chat/components/chat-view/message/sender-avatar';
import { SystemMessage } from '@/features/chat/components/chat-view/message/system-message';
import { ThreadSummary } from '@/features/chat/components/chat-view/message/thread-summary';
import { KernteamBadge } from '@/features/chat/components/forum/kernteam-badge';
import { DoubleCheck } from '@/features/chat/components/ui/double-check';
import { MessagePreviewIcon } from '@/features/chat/components/ui/message-preview-icon';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import { useLongPress } from '@/features/chat/hooks/use-long-press';
import { isMessageDeleted } from '@/features/chat/utils/message-deletion';
import { describeQuotedMessage } from '@/features/chat/utils/quoted-snippet';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { AlertCircle, Ban, Check, Clock, Ellipsis } from 'lucide-react';
import React, { useRef, useState } from 'react';

const replyToMessageText: StaticTranslationString = {
  de: 'Antwort auf eine Nachricht',
  en: 'Replying to a message',
  fr: 'Répondre à un message',
};

const deletedMessageText: StaticTranslationString = {
  de: 'Diese Nachricht wurde gelöscht',
  en: 'This message was deleted',
  fr: 'Ce message a été supprimé',
};

const deletedQuoteText: StaticTranslationString = {
  de: 'Gelöschte Nachricht',
  en: 'Deleted message',
  fr: 'Message supprimé',
};

/** What a person writes themselves and can delete again, see `deleteMessage`. */
const DELETABLE_TYPES: ReadonlySet<string> = new Set([
  MessageType.TEXT_MSG,
  MessageType.IMAGE_MSG,
  MessageType.LOCATION_MSG,
]);

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

const pendingOfflineText: StaticTranslationString = {
  de: 'Wird gesendet, sobald du wieder online bist',
  en: 'Will be sent as soon as you are back online',
  fr: 'Sera envoyé dès que vous serez de nouveau en ligne',
};

const reactionFailedText: StaticTranslationString = {
  de: 'Die Reaktion konnte nicht gespeichert werden.',
  en: 'The reaction could not be saved.',
  fr: 'La réaction n’a pas pu être enregistrée.',
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
  const { replyInThread, quoteMessage, scrollToMessage, highlightedMessageId, activeThreadId } =
    useChatActions();
  const isHighlighted = highlightedMessageId === message.id;
  const showMeta = isLastInGroup || message.sendFailed === true;
  // a group and a forum topic name who wrote; a private chat and a channel need not
  const showsSenders = chatType === 'GROUP' || chatType === 'FORUM';
  const hasAvatarSlot = !isCurrentUser && showsSenders && typeof message.senderId === 'string';

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
  // a forum post is the thread, so its comments open none of their own
  const canThread =
    (chatDetails?.capabilities.includes(ChatCapability.THREADS) ?? false) &&
    chatDetails?.type !== 'FORUM';
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
      toast.error(userErrorMessage(error, locale, chatErrorTexts, reactionFailedText));
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
  // a quoted message outside the loaded pages is read on its own, for its author's name
  const { data: fetchedQuotedMessage } = trpc.chat.getMessage.useQuery(
    { messageId: quotedMessageId ?? '' },
    {
      enabled:
        quotedMessageId !== undefined &&
        quotedMessage === undefined &&
        message.quotedMessageDeleted !== true,
    },
  );
  const quotedSource = quotedMessage ?? fetchedQuotedMessage;
  const isQuoteDeleted = message.quotedMessageDeleted === true || isMessageDeleted(quotedSource);
  let quotedAuthor: string | undefined;
  if (quotedSource === undefined || isQuoteDeleted) quotedAuthor = undefined;
  else if (quotedSource.senderId === currentUserId) quotedAuthor = youText[activeLocale];
  else if (quotedSource.senderName !== undefined)
    quotedAuthor = splitDisplayName(quotedSource.senderName).primary;
  // the quoted message as the chat list names it, an image as "Bild" behind its icon; the
  // snippet stored with the reply only stands in until the quoted message is loaded
  const quotePreview =
    quotedSource === undefined || isQuoteDeleted
      ? undefined
      : describeQuotedMessage(quotedSource.messagePayload, activeLocale);
  let quoteText = replyToMessageText[activeLocale];
  if (quotePreview !== undefined && quotePreview.text !== '') quoteText = quotePreview.text;
  else if (quotePreview === undefined && quotedSnippet !== undefined && quotedSnippet !== '')
    quoteText = quotedSnippet;

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
    // the ticks take the time's colour; read fills them instead of changing colour
    switch (message.status) {
      case MessageEventType.STORED: {
        return <Check className="ml-1 h-3.5 w-3.5" strokeWidth={2.5} />;
      }
      case MessageEventType.RECEIVED: {
        return <DoubleCheck surface="brand" className="ml-1" />;
      }
      case MessageEventType.READ: {
        return <DoubleCheck read surface="brand" className="ml-1" />;
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

  const senderNameLine = !isCurrentUser && isFirstInGroup && showsSenders && message.senderName && (
    <span className="mb-1 flex max-w-full items-center gap-1.5 px-1.5 text-[13px] text-green-700">
      <span className="min-w-0 truncate">
        <span className={cn('font-semibold', avatarTextColorOf(message.senderId ?? ''))}>
          {splitDisplayName(message.senderName).primary}
        </span>
        {/* the Kernteam badge names the function already */}
        {senderFunktionen !== '' && message.kernteamLabel === undefined && ` · ${senderFunktionen}`}
      </span>
      {message.byTopicAdmin === true && (
        <KernteamBadge locale={activeLocale} label={message.kernteamLabel} />
      )}
    </span>
  );

  // the thread hangs on its message, not between it and the next one
  const threadSummary = !hideReplyCount &&
    message.replyCount !== undefined &&
    message.replyCount > 0 && (
      <ThreadSummary
        message={message}
        replyCount={message.replyCount}
        hasUnreadReplies={message.hasUnreadReplies === true && activeThreadId !== message.id}
        locale={activeLocale}
        onOpen={() => replyInThread(message.id)}
      />
    );

  // A deleted message keeps its place, its sender, its time and its thread, and nothing else:
  // no content, no reactions, and no actions.
  if (isMessageDeleted(message)) {
    return (
      <MessageRow
        id={`message-${message.id}`}
        isCurrentUser={isCurrentUser}
        isGroup={showsSenders}
        className={cn(isHighlighted && 'animate-message-highlight rounded-xl')}
        avatar={
          hasAvatarSlot &&
          typeof message.senderId === 'string' && (
            <div className="relative pl-2">
              <SenderAvatar
                senderId={message.senderId}
                name={message.senderName ?? ''}
                pictureUrl={senderPictureUrl}
                hidden={!isLastInGroup}
              />
            </div>
          )
        }
      >
        {senderNameLine}
        <div
          className={cn(
            'border-line flex items-center gap-1.5 rounded-[16px] border bg-white px-3.5 py-2 text-[15px] leading-[21px] text-green-700',
            bubbleCornerClassName(isCurrentUser, isFirstInGroup, isLastInGroup),
          )}
        >
          <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="italic">{deletedMessageText[activeLocale]}</span>
          {showMeta && (
            <span className="ml-2 self-end text-[11px] leading-[19px] tabular-nums">
              {formatMessageTimeOnlyRaw(message.createdAt, activeLocale)}
            </span>
          )}
        </div>
        {threadSummary}
      </MessageRow>
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
      {isQuoteDeleted ? (
        <span className="line-clamp-2 text-[13px] leading-snug italic">
          {deletedQuoteText[activeLocale]}
        </span>
      ) : (
        <span className="line-clamp-2 text-[13px] leading-snug">
          <MessagePreviewIcon icon={quotePreview?.icon} />
          {quoteText}
        </span>
      )}
    </button>
  );
  return (
    <>
      <MessageRow
        id={`message-${message.id}`}
        isCurrentUser={isCurrentUser}
        isGroup={showsSenders}
        className={cn('group', isHighlighted && 'animate-message-highlight rounded-xl')}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setIsHovered(true);
        }}
        onPointerLeave={() => setIsHovered(false)}
        avatar={
          hasAvatarSlot &&
          typeof message.senderId === 'string' && (
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
          )
        }
      >
        {senderNameLine}
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
          <MessageBubble
            ref={bubbleReference}
            // reachable by keyboard for the context-menu key, and where focus returns from the sheet
            tabIndex={0}
            message={message}
            isCurrentUser={isCurrentUser}
            locale={activeLocale}
            isFirstInGroup={isFirstInGroup}
            isLastInGroup={isLastInGroup}
            showMeta={showMeta}
            quote={quoteBlock}
            status={renderMessageStatus()}
            isPressed={isPressing}
            aside={
              /* beside the bubble, towards the middle: the time where the bubble does not show
                 it, and under a mouse the way to the actions a finger reaches by holding it */
              isTimeRevealedOrHovered && (
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
                      className="focus-visible:focus-surface hover:bg-quiet flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-green-700 hover:text-green-900"
                    >
                      <Ellipsis className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )
            }
          />

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

        {threadSummary}
      </MessageRow>

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
                bubbleColorClassName(isCurrentUser, message.byTopicAdmin === true),
              )}
            >
              <MessageBubbleContent
                message={message}
                isCurrentUser={isCurrentUser}
                locale={activeLocale}
                quote={quoteBlock}
                reserveMeta={false}
              />
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
          canDelete={
            isCurrentUser &&
            isSent &&
            currentUserParticipant !== undefined &&
            DELETABLE_TYPES.has(message.type)
          }
        />
      )}
    </>
  );
};
