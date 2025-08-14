import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { MessageDto } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, MoreHorizontal, UserCircle } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

const messageOptionsAriaLabel: StaticTranslationString = {
  de: 'Nachrichten-Optionen',
  en: 'Message options',
  fr: 'Options de message',
};

interface MessageProperties {
  message: MessageDto;
  isCurrentUser: boolean;
}

const formatMessageContent = (text: string): React.ReactNode[] => {
  // Regex to split the string by WhatsApp-style formatting delimiters and also by URLs, keeping the delimiters/URLs.
  const splitFormattingAndLinkRegex = /(\*.*?\*|_.*?_|~.*?~|https?:\/\/[^\s]+)/g;

  // Regexes to identify the type of formatting in a matched part
  const boldRegex = /^\*(.+)\*$/; // Matches *content*
  const italicRegex = /^_(.+)_$/; // Matches _content_
  const strikethroughRegex = /^~(.+)~$/; // Matches ~content~
  const urlRegex = /^(https?:\/\/[^\s]+)$/; // Matches a URL

  // Split the text by newlines first
  const lines = text.split('\n');

  return lines.flatMap((line, lineIndex) => {
    // Split the line by formatting delimiters and links
    const parts = line.split(splitFormattingAndLinkRegex).filter(Boolean);

    const formattedParts = parts.map((part, partIndex) => {
      let match;

      // Check for bold
      match = part.match(boldRegex);
      if (match?.[1] != undefined) {
        return <strong key={`${lineIndex}-${partIndex}-bold`}>{match[1]}</strong>;
      }

      // Check for italic
      match = part.match(italicRegex);
      if (match?.[1] != undefined) {
        return <em key={`${lineIndex}-${partIndex}-italic`}>{match[1]}</em>;
      }

      // Check for strikethrough
      match = part.match(strikethroughRegex);
      if (match?.[1] != undefined) {
        return <s key={`${lineIndex}-${partIndex}-strikethrough`}>{match[1]}</s>;
      }

      // Check for URL
      match = part.match(urlRegex);
      if (match?.[1] != undefined) {
        const url = match[1];
        return (
          <Link
            key={`${lineIndex}-${partIndex}-link`}
            href={url}
            className="underline"
            target="_blank" // Opens in a new tab
            rel="noopener noreferrer" // Security best practice
          >
            {url}
          </Link>
        );
      }

      // If no special formatting or link, return the part as plain text
      return part;
    });

    if (lineIndex < lines.length - 1) {
      return [...formattedParts, <br key={`br-${lineIndex}`} />];
    }
    return formattedParts;
  });
};

/**
 * Renders a system message in the chat.
 *
 * @param content
 * @constructor
 */
const RenderSystemMessage: React.FC<{ message: MessageDto }> = ({ message }) => {
  const renderedContent = formatMessageContent(message.content);
  return (
    <div className="flex items-center justify-center p-4 text-gray-500">
      <span className="font-body text-center text-balance" style={{ whiteSpace: 'pre-wrap' }}>
        {renderedContent}
      </span>
    </div>
  );
};

/**
 * A dropdown component that displays message event timestamps.
 * (e.g., Sent, Delivered, Read)
 */
const MessageInfoDropdown: React.FC<{
  message: MessageDto;
  isCurrentUser: boolean;
  onClose: () => void;
}> = ({ message, isCurrentUser, onClose }) => {
  const { formatMessageTime } = useFormatDate();
  const dropdownReference = useRef<HTMLDivElement>(null);

  // Effect to handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownReference.current && !dropdownReference.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // TODO: set correct dates based on message events
  const sentDate: Date = new Date(message.timestamp);
  const deliveredDate = new Date(message.timestamp) as Date | undefined;
  const readDate = new Date(message.timestamp) as Date | undefined;

  return (
    <div
      ref={dropdownReference}
      className={cn(
        'ring-opacity-5 absolute top-8 z-10 mt-1 w-56 rounded-lg bg-white p-3 shadow-xl ring-1 ring-black focus:outline-none',
        isCurrentUser ? 'right-0' : 'left-0',
      )}
      role="menu"
      aria-orientation="vertical"
    >
      <ul>
        <li className="flex justify-between py-1 text-sm text-gray-800">
          <span className="font-semibold">Sent</span>
          <span className="text-gray-600">{formatMessageTime(sentDate)}</span>
        </li>
        {deliveredDate !== undefined && (
          <li className="flex justify-between border-t border-gray-100 py-1 pt-2 text-sm text-gray-800">
            <span className="font-semibold">Delivered</span>
            <span className="text-gray-600">{formatMessageTime(deliveredDate)}</span>
          </li>
        )}
        {readDate !== undefined && (
          <li className="flex justify-between border-t border-gray-100 py-1 pt-2 text-sm text-gray-800">
            <span className="font-semibold">Read</span>
            <span className="text-gray-600">{formatMessageTime(readDate)}</span>
          </li>
        )}
      </ul>
    </div>
  );
};

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
    return <RenderSystemMessage message={message} />;
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
