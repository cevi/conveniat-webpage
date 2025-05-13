'use client';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import type { Chat } from '@/features/chat/types/chat';
import { cn } from '@/utils/tailwindcss-override';
import { formatDistanceToNow } from 'date-fns';
import { Badge, Users } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const ChatPreview: React.FC<{
  chat: Chat;
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
          'relative flex items-center space-x-4 rounded-md p-4 transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          hasUnread ? 'bg-gray-50 dark:bg-gray-900' : '',
        )}
      >
        <div className="flex-shrink-0">
          {isGroupChat ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <Users size={20} className="text-gray-600 dark:text-gray-300" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                {chat.name.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {chat.name}
              {isGroupChat && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({participantCount})
                </span>
              )}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timestamp}</span>
          </div>

          <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
            {chat.lastMessage?.content ?? 'No messages yet'}
          </p>
        </div>

        {hasUnread && (
          <Badge className="ml-auto bg-blue-500 dark:bg-blue-600">{chat.unreadCount}</Badge>
        )}
      </li>
    </Link>
  );
};
