import type { Chat } from '@/features/chat/types/chat';
import { MessageSquare, UsersRound } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const ChatPreview: React.FC<{
  chat: Chat;
}> = ({ chat }) => {
  const chatDetailLink = `chat/${chat.id}`;

  return (
    <li className="cursor-pointer bg-none p-4 hover:bg-gray-100">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <UsersRound size={32} />
        </div>
        <Link className="min-w-0 flex-1" href={chatDetailLink}>
          <p className="truncate text-sm font-medium text-gray-900">{chat.name}</p>
          <p className="truncate text-sm text-gray-500">{chat.lastMessage.content}</p>
        </Link>
        <div className="flex-shrink-0">
          <MessageSquare size={20} className="text-gray-400" />
        </div>
      </div>
    </li>
  );
};
