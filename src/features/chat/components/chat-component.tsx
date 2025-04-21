import React from 'react';
import { MessageSquare, UserRound, UsersRound } from 'lucide-react';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';

export const ChatComponent: React.FC = () => {
  const chats = [
    { id: 1, name: 'John Doe', lastMessage: 'Hey, how are you?', avatar: <UserRound size={32} /> },
    {
      id: 2,
      name: 'Group Chat',
      lastMessage: 'Meeting at 3 PM.',
      avatar: <UsersRound size={32} />,
    },
    { id: 3, name: 'Jane Smith', lastMessage: 'See you later!', avatar: <UserRound size={32} /> },
    {
      id: 4,
      name: 'Another Group',
      lastMessage: 'Quick update...',
      avatar: <UsersRound size={32} />,
    },
    { id: 5, name: 'Alice', lastMessage: 'Sent a picture', avatar: <UserRound size={32} /> },
    {
      id: 6,
      name: 'Work Team',
      lastMessage: 'Project deadline extended',
      avatar: <UsersRound size={32} />,
    },
    {
      id: 7,
      name: 'Bob',
      lastMessage: 'Call me when you are free',
      avatar: <UserRound size={32} />,
    },
  ];

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b p-4">
        <HeadlineH1 className="text-center">Chats</HeadlineH1>
      </header>

      <div className="flex-grow overflow-y-auto">
        <ul className="divide-y divide-gray-200">
          {chats.map((chat) => (
            <li key={chat.id} className="cursor-pointer bg-none p-4 hover:bg-gray-100">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">{chat.avatar}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{chat.name}</p>
                  <p className="truncate text-sm text-gray-500">{chat.lastMessage}</p>
                </div>
                <div className="flex-shrink-0">
                  <MessageSquare size={20} className="text-gray-400" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
