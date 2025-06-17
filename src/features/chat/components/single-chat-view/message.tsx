import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { Message, OptimisticMessage } from '@/features/chat/types/chat';
import { cn } from '@/utils/tailwindcss-override';
import { Check, UserCircle } from 'lucide-react';
import type React from 'react';

interface MessageProperties {
  message: Message | OptimisticMessage;
  isCurrentUser: boolean;
}

const formatMessageContent = (text: string): React.ReactNode[] => {
  // Regex to split the string by WhatsApp-style formatting delimiters, keeping the delimiters.
  // It looks for *non-greedy* content between matching pairs of *, _, or ~.
  const splitRegex = /(\*.*?\*|_.*?_|~.*?~)/g;

  // Regexes to identify the type of formatting in a matched part
  const boldRegex = /^\*(.+)\*$/; // Matches *content*
  const italicRegex = /^_(.+)_$/; // Matches _content_
  const strikethroughRegex = /^~(.+)~$/; // Matches ~content~

  const parts = text.split(splitRegex).filter(Boolean);

  return parts.map((part, index) => {
    let match;

    match = part.match(boldRegex);
    if (match?.[1] != undefined) {
      return <strong key={index}>{match[1]}</strong>;
    }

    match = part.match(italicRegex);
    if (match?.[1] != undefined) {
      return <em key={index}>{match[1]}</em>; // <em> for italics
    }

    match = part.match(strikethroughRegex);
    if (match?.[1] != undefined) {
      return <s key={index}>{match[1]}</s>; // <s> for strikethrough
    }

    return part;
  });
};

export const MessageComponent: React.FC<MessageProperties> = ({ message, isCurrentUser }) => {
  const formattedTime = useFormatDate().formatMessageTime(message.timestamp);
  const renderedContent = formatMessageContent(message.content);

  // Message status indicators
  const renderMessageStatus = (): React.JSX.Element => {
    if (!isCurrentUser) return <></>;

    if ('isOptimistic' in message && message.isOptimistic) {
      return <div className="font-body ml-1 text-xs text-gray-400">Sending...</div>;
    }

    const status = message.status ?? 'sent';

    switch (status) {
      case 'sent': {
        return <Check className="ml-1 h-3.5 w-3.5 text-gray-400" />;
      }
      case 'delivered': {
        return (
          <div className="ml-1 flex">
            <Check className="h-3.5 w-3.5 text-gray-400" />
            <Check className="-ml-2 h-3.5 w-3.5 text-gray-400" />
          </div>
        );
      }
      case 'read': {
        return (
          <div className="ml-1 flex">
            <Check className="text-conveniat-green h-3.5 w-3.5" />
            <Check className="text-conveniat-green -ml-2 h-3.5 w-3.5" />
          </div>
        );
      }
    }
  };

  return (
    <div className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}>
      {!isCurrentUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <UserCircle className="h-6 w-6 text-gray-400" />
        </div>
      )}

      <div className="max-w-[75%] overflow-x-hidden">
        <div
          className={cn(
            'font-body rounded-2xl px-4 py-3 wrap-anywhere shadow-sm',
            isCurrentUser
              ? 'rounded-br-md bg-green-200 text-green-800'
              : 'rounded-bl-md border border-gray-200 bg-white text-gray-900',
            'isOptimistic' in message && message.isOptimistic && 'opacity-60',
          )}
        >
          {renderedContent}
        </div>
        <div className="mt-1 flex items-center justify-end text-xs">
          <span className="font-body text-gray-500">{formattedTime}</span>
          {renderMessageStatus()}
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
