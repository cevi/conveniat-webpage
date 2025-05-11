'use client';

import { createChat } from '@/features/chat/api/create-chat';
import { useAllContacts } from '@/features/chat/hooks/use-chats';
import React from 'react';

export const CreateNewChatClientComponent: React.FC = () => {
  // { uuid: string; name: string; }[]
  const { allContacts } = useAllContacts();

  return (
    <>
      <ul>
        {allContacts.map((contact) => (
          <li key={contact.uuid} className="flex items-center justify-between p-2">
            <span>{contact.name}</span>
            <button
              className="ml-2 rounded-md border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => createChat([contact])}
            >
              Create Chat
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};
