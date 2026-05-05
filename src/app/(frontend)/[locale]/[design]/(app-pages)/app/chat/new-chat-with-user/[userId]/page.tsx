import { trpc } from '@/trpc/server';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type React from 'react';

const labels = {
  mustBeLoggedIn: {
    en: 'You must be logged in to start a chat.',
    de: 'Du musst angemeldet sein, um einen Chat zu starten.',
    fr: 'Vous devez être connecté pour démarrer une discussion.',
  },
  goBackToChats: {
    en: 'Go back to chats',
    de: 'Zurück zu Chats',
    fr: 'Retour aux discussions',
  },
  chatCreationPaused: {
    en: 'Chat creation is currently paused by administrators.',
    de: 'Die Chat-Erstellung ist derzeit von Administratoren pausiert.',
    fr: 'La création de chat est actuellement suspendue par les administrateurs.',
  },
  failedToCreateChat: {
    en: 'Failed to create chat.',
    de: 'Chat konnte nicht erstellt werden.',
    fr: 'Échec de la création du chat.',
  },
  pleaseTryAgain: {
    en: 'Please try again.',
    de: 'Bitte versuche es erneut.',
    fr: 'Veuillez réessayer.',
  },
  unexpectedError: {
    en: 'An unexpected error occurred.',
    de: 'Ein unerwarteter Fehler ist aufgetreten.',
    fr: "Une erreur inattendue s'est produite.",
  },
} as const satisfies Record<string, StaticTranslationString>;

/**
 * A simple page that creates a new chat with the user who's uuid is passed
 * in the URL.
 */
const NewChatWithUserPage: React.FC<{
  params: Promise<{
    userId: string;
  }>;
}> = async ({ params }) => {
  const locale = await getLocaleFromCookies();
  let result:
    | 'notLoggedIn'
    | 'cannotCreateChat'
    | { type: 'failedToCreate'; userId: string }
    | { type: 'redirect'; url: string }
    | 'error';

  try {
    const { userId } = await params;

    const session = await auth();
    const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

    // Check if user is authenticated
    if (user?.uuid === undefined) {
      result = 'notLoggedIn';
    } else if (user.uuid === userId) {
      result = { type: 'redirect', url: `/app/chat` };
    } else {
      // Check Feature Flag / Capability
      const { checkCapability } = await import('@/lib/capabilities');
      const { CapabilitySubject, CapabilityAction } = await import('@/lib/capabilities/types');

      const canCreateChat = await checkCapability(CapabilityAction.Create, CapabilitySubject.Chat);

      if (canCreateChat) {
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
            console.error('[NewChatWithUserPage] Failed to create chat via TRPC:', error);
            // eslint-disable-next-line unicorn/no-useless-undefined
            return undefined; // Return undefined if chat creation fails
          });

        if (chatId === undefined) {
          console.warn('[NewChatWithUserPage] Chat creation returned undefined. userId:', userId);
          result = { type: 'failedToCreate', userId };
        } else {
          console.log('[NewChatWithUserPage] Chat created successfully. chatId:', chatId);
          result = { type: 'redirect', url: `/app/chat/${chatId}` };
        }
      } else {
        result = 'cannotCreateChat';
      }
    }
  } catch (error) {
    // Re-throw redirect errors - they're not real errors
    if (isRedirectError(error)) {
      throw error;
    }

    console.error('[NewChatWithUserPage] Fatal error in page:', error);
    result = 'error';
  }

  if (typeof result === 'object' && result.type === 'redirect') {
    redirect(result.url);
  }

  if (result === 'notLoggedIn') {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-center text-gray-600">
          {labels.mustBeLoggedIn[locale]}
          <br />
          <Link href="/app/chat" className="underline">
            {labels.goBackToChats[locale]}
          </Link>
        </div>
      </div>
    );
  }

  if (result === 'cannotCreateChat') {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-center text-gray-600">
          {labels.chatCreationPaused[locale]}
          <br />
          <Link href="/app/chat" className="underline">
            {labels.goBackToChats[locale]}
          </Link>
        </div>
      </div>
    );
  }

  if (typeof result === 'object') {
    return (
      <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
        <div className="font-body text-center text-gray-600">
          <h2 className="mb-2 text-xl font-semibold text-gray-800">
            {labels.failedToCreateChat[locale]}
          </h2>
          <p className="mb-4">{labels.pleaseTryAgain[locale]}</p>
          <Link href="/app/chat" className="text-conveniat-blue font-medium underline">
            {labels.goBackToChats[locale]}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-row items-center justify-center bg-gray-50">
      <div className="font-body text-center text-gray-600">
        <h2 className="mb-2 text-xl font-semibold text-red-600">
          {labels.unexpectedError[locale]}
        </h2>
        <p className="mb-4">Bitte versuche es später noch einmal.</p>
        <Link href="/app/chat" className="underline">
          {labels.goBackToChats[locale]}
        </Link>
      </div>
    </div>
  );
};

export default NewChatWithUserPage;
