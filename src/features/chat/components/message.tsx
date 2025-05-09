import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { Message } from '@/features/chat/types/chat';
import { cn } from '@/utils/tailwindcss-override';
import { UserCircle } from 'lucide-react';
import type React from 'react';

interface MessageProperties {
  message: Message;
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

  return (
    <div className={cn('flex items-end', isCurrentUser ? 'justify-end' : 'justify-start')}>
      {!isCurrentUser && <UserCircle />}

      <div className="w-[80%] overflow-x-hidden">
        <div
          className={cn(
            'rounded-2xl px-4 py-2 wrap-anywhere',
            isCurrentUser
              ? 'text-primary-foreground rounded-br-none bg-green-300 text-gray-950'
              : 'rounded-bl-none bg-gray-200 text-gray-800',
          )}
        >
          {renderedContent}
        </div>
        <span className="text-muted-foreground mt-1 text-xs">{formattedTime}</span>
      </div>

      {isCurrentUser && <UserCircle />}
    </div>
  );
};
