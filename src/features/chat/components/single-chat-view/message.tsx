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
      return <div className="ml-1 text-gray-400">Sending...</div>;
    }

    const status = message.status ?? 'sent';

    switch (status) {
      case 'sent': {
        return <Check className="ml-1 h-3.5 w-3.5 text-gray-200" />;
      }
      case 'delivered': {
        return (
          <div className="ml-1 flex">
            <Check className="h-3.5 w-3.5 text-gray-200" />
            <Check className="-ml-2 h-3.5 w-3.5 text-gray-200" />
          </div>
        );
      }
      case 'read': {
        return (
          <div className="ml-1 flex">
            <Check className="h-3.5 w-3.5 text-gray-700" />
            <Check className="-ml-2 h-3.5 w-3.5 text-gray-700" />
          </div>
        );
      }
    }
  };

  return (
    <div className={cn('flex items-end', isCurrentUser ? 'justify-end' : 'justify-start')}>
      {!isCurrentUser && <UserCircle className="mr-2 h-8 w-8 shrink-0" />}

      <div className="max-w-[80%] overflow-x-hidden">
        <div
          className={cn(
            'rounded-lg px-4 py-2 wrap-anywhere',
            isCurrentUser
              ? 'text-primary-foreground rounded-br-none bg-green-300 text-gray-950'
              : 'rounded-bl-none bg-gray-200 text-gray-800',
            'isOptimistic' in message && message.isOptimistic && 'opacity-50',
          )}
        >
          {renderedContent}
        </div>
        <div className="mt-1 flex items-center text-xs">
          <span className="text-muted-foreground">{formattedTime}</span>
          {renderMessageStatus()}
        </div>
      </div>

      {isCurrentUser && <UserCircle className="ml-2 h-8 w-8 shrink-0" />}
    </div>
  );
};
