'use client';
import {
  ChatAlertDialog,
  ChatAlertDialogAction,
  ChatAlertDialogCancel,
  ChatAlertDialogContent,
  ChatAlertDialogDescription,
  ChatAlertDialogFooter,
  ChatAlertDialogHeader,
  ChatAlertDialogTitle,
  ChatAlertDialogTrigger,
} from '@/features/chat/components/ui/chat-alert-dialog';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useUpdateChatMutation } from '@/features/chat/hooks/use-update-chat-mutation';
import { useUserCanArchiveChat } from '@/features/chat/hooks/use-user-can-archive';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React from 'react';
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

const localizedRoleNames: Record<ChatMembershipPermission, StaticTranslationString> = {
  [ChatMembershipPermission.OWNER]: { en: 'Owner', de: 'Besitzer', fr: 'Propriétaire' },
  [ChatMembershipPermission.ADMIN]: { en: 'Admin', de: 'Admin', fr: 'Admin' },
  [ChatMembershipPermission.MEMBER]: { en: 'Member', de: 'Mitglied', fr: 'Membre' },
  [ChatMembershipPermission.GUEST]: { en: 'Guest', de: 'Gast', fr: 'Invité' },
};

const getCannotDeleteExplanation = (role: ChatMembershipPermission, locale: Locale): string => {
  const roleName = localizedRoleNames[role][locale];
  const explanations: StaticTranslationString = {
    en: `Only admins and owners can delete this chat. Your role: ${roleName}.`,
    de: `Nur Admins und Besitzer können diesen Chat löschen. Deine Rolle: ${roleName}.`,
    fr: `Seuls les admins et propriétaires peuvent supprimer cette discussion. Votre rôle: ${roleName}.`,
  };
  return explanations[locale];
};

const localizedCancel: StaticTranslationString = {
  en: 'Cancel',
  de: 'Abbrechen',
  fr: 'Annuler',
};

export const DeleteChat: React.FC = () => {
  const router = useRouter();
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const deleteChatMutation = useArchiveChatMutation();
  const updateChatMutation = useUpdateChatMutation();

  const canUserArchiveChat = useUserCanArchiveChat(chatId);

  // Get user's current role in this chat
  const { data: currentUser } = trpc.chat.user.useQuery({});
  const { data: chatDetails } = useChatDetail(chatId);
  const currentUserMembership = chatDetails?.participants.find((p) => p.id === currentUser);
  const userRole = currentUserMembership?.chatPermission ?? ChatMembershipPermission.GUEST;

  /*
   * We need a state for the dialog open/close to properly handle the
   * programmatic closing after deletion if needed, although router push happens.
   * But mostly to control the confirm action.
   */
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleDeleteChat = (): void => {
    deleteChatMutation.mutate(
      { chatUuid: chatId },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          router.push('/app/chat');
        },
      },
    );
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-body text-sm font-medium text-gray-600">
          {localizedDeleteChat[locale]}
        </div>
      </div>

      {!canUserArchiveChat && (
        <div className="mb-2 text-sm text-gray-500">
          {getCannotDeleteExplanation(userRole, locale)}
        </div>
      )}

      <ChatAlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ChatAlertDialogTrigger asChild>
          <button
            aria-label={'Delete Chat'}
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
        </ChatAlertDialogTrigger>
        <ChatAlertDialogContent>
          <ChatAlertDialogHeader>
            <ChatAlertDialogTitle>{localizedDeleteChat[locale]}</ChatAlertDialogTitle>
            <ChatAlertDialogDescription>
              {localizedDeleteChatWarning[locale]}
            </ChatAlertDialogDescription>
          </ChatAlertDialogHeader>
          <ChatAlertDialogFooter>
            <ChatAlertDialogCancel>{localizedCancel[locale]}</ChatAlertDialogCancel>
            <ChatAlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleDeleteChat();
              }}
              disabled={deleteChatMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteChatMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {localizedDeleteChat[locale]}
                </>
              ) : (
                localizedDeleteChat[locale]
              )}
            </ChatAlertDialogAction>
          </ChatAlertDialogFooter>
        </ChatAlertDialogContent>
      </ChatAlertDialog>
    </>
  );
};
