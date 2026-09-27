'use client';
import { isChatArchived } from '@/features/chat/api/checks/is-chat-archived';
import {
  ArchiveChatConfirmDialog,
  localizedDeleteChat,
} from '@/features/chat/components/archive-chat-confirm-dialog';
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

      <button
        aria-label={'Delete Chat'}
        onClick={() => setIsDialogOpen(true)}
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

      <ArchiveChatConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleDeleteChat}
        isPending={deleteChatMutation.isPending}
        archivesForEveryone={chatDetails === undefined || !isChatArchived(chatDetails)}
      />
    </>
  );
};
