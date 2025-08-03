import { createChat } from '@/features/chat/api/create-chat';
import { redirect } from 'next/navigation';
import type React from 'react';

/**
 * A simple page that creates a new chat with the user who's uuid is passed
 * in the URL.
 *
 * @param params
 * @constructor
 */
const NewChatWithUserPage: React.FC<{
  params: Promise<{
    userId: string;
  }>;
}> = async ({ params }) => {
  const { userId } = await params;

  const chatName = ''; // Private chats do not require a name
  const contacts = [
    {
      uuid: userId,
      name: '', // Name will be fetched from the user profile
    },
  ];
  const chatId = await createChat(contacts, chatName);
  redirect(`/app/chat/${chatId}`);
};

export default NewChatWithUserPage;
