import { trpc } from '@/trpc/server';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import Link from 'next/link';
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

  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser;

  if (user.uuid == userId) {
    return redirect(`/app/chat`); // do not allow to create self-chat.
  }

  const chatName = ''; // Private chats do not require a name
  const contacts = [
    {
      uuid: userId,
      name: '', // Name will be fetched from the user profile
    },
  ];
  const chatId = await trpc.chat
    .createChat({
      chatName,
      members: contacts.map((contact) => ({
        userId: contact.uuid,
      })),
    })
    .catch((error: unknown) => {
      console.error('Failed to create chat:', error);
      return; // Return undefined if chat creation fails
    });

  if (chatId === undefined) {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-center text-gray-600">
          Failed to create chat.
          <br />
          <Link href="/app/chat" className="underline">
            Please try again.
          </Link>
        </div>
      </div>
    );
  }

  redirect(`/app/chat/${chatId}`);
};

export default NewChatWithUserPage;
