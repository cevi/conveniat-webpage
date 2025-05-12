'use client';

import { createChat } from '@/features/chat/api/create-chat';
import type { Contact } from '@/features/chat/api/get-contacts';
import { CHATS_QUERY_KEY, useAllContacts } from '@/features/chat/hooks/use-chats';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

export const CreateNewChatClientComponent: React.FC = () => {
  const { data: allContacts } = useAllContacts();

  const queryClient = useQueryClient();

  const chatCreationHandler = (contact: Contact): void => {
    createChat([contact])
      .then(() => queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY }))
      .catch(console.error);
  };

  return (
    <>
      <ul>
        {allContacts?.map((contact) => (
          <li key={contact.uuid} className="flex items-center justify-between p-2">
            <span>{contact.name}</span>
            <button
              className="ml-2 rounded-md border border-transparent bg-blue-600 px-2 py-1 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => chatCreationHandler(contact)}
            >
              Create Chat
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};
