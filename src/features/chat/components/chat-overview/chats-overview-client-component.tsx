'use client';
import { ChatPreview } from '@/features/chat/components/chat-overview/chat-preview';
import { useChats } from '@/features/chat/hooks/use-chats';
import React from 'react';

export const ChatsOverviewClientComponent: React.FC = () => {
  const { chats } = useChats();

  return (
    <ul className="divide-y divide-gray-200">
      {chats.map((chat) => (
        <ChatPreview key={chat.id} chat={chat} />
      ))}
    </ul>
  );
};
