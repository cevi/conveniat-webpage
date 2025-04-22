import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { Message } from '@/features/chat/types/chat';
import { cn } from '@/utils/tailwindcss-override';
import { UserCircle } from 'lucide-react';
import type React from 'react';

interface MessageProperties {
  message: Message;
  isCurrentUser: boolean;
}

export const MessageComponent: React.FC<MessageProperties> = ({ message, isCurrentUser }) => {
  const formattedTime = useFormatDate().formatMessageTime(message.timestamp);

  return (
    <div className={cn('flex max-w-[80%] items-end gap-2', isCurrentUser ? 'ml-auto' : 'mr-auto')}>
      {!isCurrentUser && <UserCircle />}

      <div className="flex flex-col">
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isCurrentUser
              ? 'text-primary-foreground rounded-br-none bg-green-300 text-gray-950'
              : 'rounded-bl-none bg-gray-200 text-gray-800',
          )}
        >
          {message.content}
        </div>
        <span className="text-muted-foreground mt-1 text-xs">{formattedTime}</span>
      </div>

      {isCurrentUser && <UserCircle />}
    </div>
  );
};
