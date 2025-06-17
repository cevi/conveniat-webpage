'use client';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import type { ChatDto } from '@/features/chat/types/api-dto-types';
import { cn } from '@/utils/tailwindcss-override';
import { formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

export const ChatPreview: React.FC<{
  chat: ChatDto;
  // eslint-disable-next-line complexity
}> = ({ chat }) => {
  const chatDetailLink = `chat/${chat.id}`;
  const hasUnread = chat.unreadCount && chat.unreadCount > 0;
  const timestamp = chat.lastMessage?.timestamp
    ? formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: true })
    : '';

  const { data: chatDetails } = useChatDetail(chat.id);

  // Determine participant count for group chats
  const participantCount = chatDetails?.participants.length ?? 0;
  const isGroupChat = participantCount > 2;

  return (
    <Link href={chatDetailLink} className="block w-full">
      <li
        className={cn(
          'relative flex items-center space-x-4 rounded-lg p-4 transition-all duration-200',
          'hover:bg-gray-100 hover:shadow-sm',
          hasUnread ? 'border-conveniat-green border-l-4 bg-green-50' : 'bg-white',
        )}
      >
        <div className="shrink-0">
          {isGroupChat ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 shadow-sm">
              <Users size={20} className="text-gray-600" />
            </div>
          ) : (
            <div className="bg-conveniat-green flex h-12 w-12 items-center justify-center rounded-full shadow-sm">
              <span className="font-heading text-sm font-semibold text-white">
                {chat.name.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  'font-heading truncate text-sm',
                  hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800',
                )}
              >
                {chat.name}
              </p>
              {isGroupChat && (
                <span className="font-body rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {participantCount}
                </span>
              )}
            </div>
            <span className="font-body text-xs text-gray-500">{timestamp}</span>
          </div>

          <p
            className={cn(
              'font-body mt-1 truncate text-sm',
              hasUnread ? 'font-medium text-gray-700' : 'text-gray-500',
            )}
          >
            {chat.lastMessage?.content ?? 'No messages yet'}
          </p>
        </div>

        {hasUnread && (
          <div className="bg-conveniat-green font-body flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm">
            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
          </div>
        )}
      </li>
    </Link>
  );
};
