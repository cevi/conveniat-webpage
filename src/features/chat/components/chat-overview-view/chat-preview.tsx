'use client';
import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatType } from '@prisma/client';
import { Siren, Users } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

export const ChatPreview: React.FC<{
  chat: ChatWithMessagePreview;
}> = ({ chat }) => {
  const chatDetailLink = `/app/chat/${chat.id}`;
  const hasUnread = chat.unreadCount > 0;
  const { formatMessageTime } = useFormatDate();

  const timestamp = formatMessageTime(new Date(chat.lastMessage.createdAt));

  return (
    <Link href={chatDetailLink} className="block w-full">
      <li
        className={cn(
          'relative flex items-center space-x-4 rounded-lg p-4 transition-all duration-200',
          'hover:shadow-sm',
          {},
        )}
      >
        <div className="shrink-0">
          {chat.chatType === ChatType.GROUP && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 shadow-sm">
              <Users size={20} className="text-gray-600" />
            </div>
          )}
          {chat.chatType === ChatType.ONE_TO_ONE && (
            <div className="bg-conveniat-green flex h-12 w-12 items-center justify-center rounded-full shadow-sm">
              <span className="font-heading text-sm font-semibold text-white">
                {chat.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {chat.chatType === ChatType.EMERGENCY && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-red-500">
              <Siren size={20} className="text-red-500" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 flex-1 flex-col pr-2">
              <div className="flex items-center gap-2">
                <p
                  className={cn('font-heading truncate text-sm font-semibold', {
                    'text-gray-900': hasUnread,
                    'text-gray-800': !hasUnread,
                    'text-red-500': chat.chatType === ChatType.EMERGENCY,
                  })}
                >
                  {chat.name}
                </p>
              </div>
            </div>
            <span
              className={cn('font-body shrink-0 text-xs whitespace-nowrap text-gray-500', {
                'text-red-500': chat.chatType === ChatType.EMERGENCY,
              })}
            >
              {timestamp}
            </span>
          </div>

          <p
            className={cn('font-body mt-1 truncate text-sm', {
              'font-medium text-gray-700': hasUnread,
              'text-gray-500': !hasUnread,
              'text-red-500': chat.chatType === ChatType.EMERGENCY,
            })}
          >
            {chat.lastMessage.messagePreview}
          </p>
        </div>

        {hasUnread && (
          <div className="bg-conveniat-green font-body flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm">
            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
          </div>
        )}
      </li>
    </Link>
  );
};
