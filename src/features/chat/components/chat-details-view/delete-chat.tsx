'use client';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import { useUpdateChatMutation } from '@/features/chat/hooks/use-update-chat-mutation';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useUserCanArchiveChat } from '../../hooks/use-user-can-archive';

const localizedDeleteChat: StaticTranslationString = {
  en: 'Delete Chat',
  de: 'Chat löschen',
  fr: 'Supprimer la discussion',
};

const localizedDeleteChatWarning: StaticTranslationString = {
  en:
    'Deleting this chat is irreversible and will remove it from your view. Other members ' +
    'will still be able to access and read its messages.',
  de:
    'Das Löschen dieses Chats ist irreversibel und entfernt ihn aus deiner Chat-Ansicht. ' +
    'Andere Mitglieder können weiterhin auf die Nachrichten zugreifen und sie lesen.',
  fr:
    'La suppression de cette discussion est irréversible et la retirera de votre vue, ' +
    'mais les autres membres pourront toujours accéder et lire ses messages.',
};

export const DeleteChat: React.FC = () => {
  const router = useRouter();
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const deleteChatMutation = useArchiveChatMutation();
  const updateChatMutation = useUpdateChatMutation();

  const canUserArchiveChat = useUserCanArchiveChat(chatId);

  const handleDeleteChat = (): void => {
    deleteChatMutation.mutate({ chatUuid: chatId });
    /*
     * We send back the user to the overview page immediately
     * after the delete mutation is triggered.
     *
     * This is possible as the delete chat mutation does an optimistic update
     * removing the chat from the list immediately after the mutation is triggered.
     */
    router.push('/app/chat');
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-body text-sm font-medium text-gray-600">
          {localizedDeleteChat[locale]}
        </div>
      </div>
      <div className="mb-2 text-sm text-gray-500">{localizedDeleteChatWarning[locale]}</div>

      <button
        aria-label={'Delete Chat'}
        onClick={handleDeleteChat}
        disabled={
          !canUserArchiveChat || updateChatMutation.isPending || deleteChatMutation.isPending
        }
        className={cn('mt-4 w-full rounded-md px-4 py-2', {
          'cursor-pointer bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none':
            canUserArchiveChat,
          'cursor-not-allowed bg-gray-300 text-gray-500': !canUserArchiveChat,
        })}
      >
        {localizedDeleteChat[locale]}
      </button>
    </>
  );
};
