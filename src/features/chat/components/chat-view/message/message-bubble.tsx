import type { ChatMessage } from '@/features/chat/api/types';
import { ChatImage } from '@/features/chat/components/chat-view/message/chat-image';
import { ImageMessage } from '@/features/chat/components/chat-view/message/image-message';
import { extractMessageImages } from '@/features/chat/components/chat-view/message/utils/extract-message-images';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/*
 * How a message looks, apart from what can be done with it: these pieces take the message and
 * read nothing else, so a bubble can be drawn without a chat to load, as the live preview of an
 * announcement does. `MessageComponent` adds the queries, the gestures and the actions.
 */

/** Rounder outside a run of bubbles, tighter where two bubbles of one sender meet. */
export const bubbleCornerClassName = (
  isCurrentUser: boolean,
  isFirstInGroup: boolean,
  isLastInGroup: boolean,
): string => {
  if (isCurrentUser) {
    return cn(!isFirstInGroup && 'rounded-tr-[6px]', !isLastInGroup && 'rounded-br-[6px]');
  }
  return cn(!isFirstInGroup && 'rounded-tl-[6px]', !isLastInGroup && 'rounded-bl-[6px]');
};

/** Brand green for the user's own messages, white for everyone else's. */
export const bubbleColorClassName = (isCurrentUser: boolean): string =>
  isCurrentUser ? 'bg-conveniat-green text-white' : 'border-line border bg-white text-green-900';

interface MessageRowProperties {
  isCurrentUser: boolean;
  /** A group chat sets the avatar column; every other chat indents the bubble instead. */
  isGroup: boolean;
  /** The sender's avatar, beside the column, in a group chat. */
  avatar?: React.ReactNode;
  id?: string;
  className?: string;
  onPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}

/** One message's line in the chat: on the user's side or the other, with the avatar beside it. */
export const MessageRow: React.FC<MessageRowProperties> = ({
  isCurrentUser,
  isGroup,
  avatar,
  id,
  className,
  onPointerEnter,
  onPointerLeave,
  children,
}) => (
  <div
    id={id}
    className={cn(
      'relative flex w-full items-end gap-2 transition-colors duration-200',
      isCurrentUser ? 'justify-end' : 'justify-start',
      className,
    )}
    onPointerEnter={onPointerEnter}
    onPointerLeave={onPointerLeave}
  >
    {avatar}
    <div
      className={cn(
        'relative flex max-w-[85%] flex-col',
        isCurrentUser ? 'items-end pr-2' : 'items-start',
        !isCurrentUser && !isGroup && 'pl-2',
      )}
    >
      {children}
    </div>
  </div>
);

interface MessageBubbleContentProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  locale: Locale;
  /** The message this one answers, above its content. */
  quote?: React.ReactNode;
  /** Keeps room at the end for the time, which the bubble lays over its last line. */
  reserveMeta: boolean;
}

/** What a bubble holds: the quote, then the image of an image message, or images and text. */
export const MessageBubbleContent: React.FC<MessageBubbleContentProperties> = ({
  message,
  isCurrentUser,
  locale,
  quote,
  reserveMeta,
}) => {
  if (message.type === MessageType.IMAGE_MSG) {
    return (
      <>
        {quote}
        <div className={cn(reserveMeta && 'pb-4')}>
          <ImageMessage message={message} />
        </div>
      </>
    );
  }

  const attachedImages = extractMessageImages(message.messagePayload, locale);
  return (
    <>
      {quote}
      {attachedImages.length > 0 && (
        <div className="mb-2 flex flex-col gap-2">
          {attachedImages.map((image) => (
            <ChatImage key={image.url} url={image.url} alt={image.alt} caption={image.caption} />
          ))}
        </div>
      )}
      <div className="text-[15px] leading-[21px]">
        {formatMessageContent(message.messagePayload, locale)}
        {/* keeps the end of the last line free for the time, which sits on it, or moves to a
            line of its own when the text runs to the edge */}
        {reserveMeta && (
          <span
            aria-hidden="true"
            className={cn('inline-block h-px', isCurrentUser ? 'w-[66px]' : 'w-[40px]')}
          />
        )}
      </div>
    </>
  );
};

interface MessageBubbleProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  locale: Locale;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  /** Shows the time, and the status of an own message, in the bubble. */
  showMeta: boolean;
  quote?: React.ReactNode;
  /** How far an own message got, after its time. */
  status?: React.ReactNode;
  /** What hangs beside the bubble, like the time on demand and the actions under a mouse. */
  aside?: React.ReactNode;
  /** Looks pressed while a finger holds it. */
  isPressed?: boolean;
  ref?: React.Ref<HTMLDivElement>;
  tabIndex?: number;
}

/** A message as a bubble: its content, its time and status, its colour and its corners. */
export const MessageBubble: React.FC<MessageBubbleProperties> = ({
  message,
  isCurrentUser,
  locale,
  isFirstInGroup = true,
  isLastInGroup = true,
  showMeta,
  quote,
  status,
  aside,
  isPressed = false,
  ref,
  tabIndex,
}) => (
  <div
    ref={ref}
    tabIndex={tabIndex}
    className={cn(
      'relative rounded-[16px] px-3.5 py-2 transition-transform duration-150',
      // `anywhere`, not `break-word`: only it lowers the min-content width, so a long URL
      // wraps inside the bubble instead of stretching it past the screen edge
      'max-w-full min-w-[64px] wrap-anywhere',
      bubbleColorClassName(isCurrentUser),
      bubbleCornerClassName(isCurrentUser, isFirstInGroup, isLastInGroup),
      // pending shows as a quieter bubble and a clock, never a spinner
      message.status === MessageEventType.CREATED && message.sendFailed !== true && 'opacity-80',
      message.sendFailed === true && 'ring-danger ring-2',
      isPressed && 'scale-[0.98]',
    )}
  >
    <MessageBubbleContent
      message={message}
      isCurrentUser={isCurrentUser}
      locale={locale}
      quote={quote}
      reserveMeta={showMeta}
    />
    {/* Timestamp and status: in the bubble for the last of a block, beside it on demand for the
        others, so revealing it never changes the height of the list */}
    {showMeta && (
      <div
        className={cn(
          'absolute right-3 bottom-[7px] flex items-center gap-1 text-[11px] leading-none',
          // 4.5:1 on both bubbles: white over the green, the secondary text on white
          isCurrentUser ? 'text-white/85' : 'text-green-700',
        )}
      >
        {/* the browser's clock, which the server rendering a preview does not share */}
        <span className="tabular-nums" suppressHydrationWarning>
          {formatMessageTimeOnlyRaw(message.createdAt, locale)}
        </span>
        {status}
      </div>
    )}
    {aside}
  </div>
);
