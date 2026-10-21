'use client';
import {
  ArchiveChatConfirmDialog,
  localizedDeleteChat,
} from '@/features/chat/components/archive-chat-confirm-dialog';
import { detailsActionRowClassName } from '@/features/chat/components/chat-details-view/leave-chat';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useUpdateChatMutation } from '@/features/chat/hooks/use-update-chat-mutation';
import { useUserCanArchiveChat } from '@/features/chat/hooks/use-user-can-archive';
import { isChatArchived } from '@/lib/chat-shared';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Trash2 } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React from 'react';
const localizedRoleNames: Record<ChatMembershipPermission, StaticTranslationString> = {
  [ChatMembershipPermission.OWNER]: { en: 'Owner', de: 'Besitzer', fr: 'Propriétaire' },
  [ChatMembershipPermission.ADMIN]: { en: 'Admin', de: 'Admin', fr: 'Admin' },
  [ChatMembershipPermission.MEMBER]: { en: 'Member', de: 'Mitglied', fr: 'Membre' },
  [ChatMembershipPermission.GUEST]: { en: 'Guest', de: 'Gast', fr: 'Invité' },
};

const deleteForEveryoneText: StaticTranslationString = {
  de: 'Chat für alle löschen',
  en: 'Delete chat for everyone',
  fr: 'Supprimer le chat pour tout le monde',
};

const localizedRemoveFromViewText: StaticTranslationString = {
  de: 'Er verschwindet nur aus deiner Chat-Liste.',
  en: 'It only disappears from your chat list.',
  fr: 'Il disparaît seulement de ta liste de chats.',
};

const historyGoneText = (count: number, locale: Locale): string => {
  if (locale === 'de') return `Der Verlauf verschwindet für alle ${count} Teilnehmenden.`;
  if (locale === 'fr') return `L'historique disparaît pour les ${count} participant·es.`;
  return `The history disappears for all ${count} participants.`;
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

  const isForEveryone = chatDetails === undefined || !isChatArchived(chatDetails);
  const participantCount = chatDetails?.participants.length ?? 0;
  let subtitle = getCannotDeleteExplanation(userRole, locale);
  if (canUserArchiveChat) {
    subtitle = isForEveryone
      ? historyGoneText(participantCount, locale)
      : localizedRemoveFromViewText[locale];
  }

  return (
    <>
      {/* red: it deletes the chat for everybody and cannot be undone, and it says so */}
      <button
        type="button"
        className={cn(detailsActionRowClassName, 'hover:bg-danger-soft')}
        onClick={() => setIsDialogOpen(true)}
        disabled={
          !canUserArchiveChat || updateChatMutation.isPending || deleteChatMutation.isPending
        }
      >
        <Trash2 className="text-danger-text h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          <span className="text-danger-text block text-[15px] font-semibold">
            {isForEveryone ? deleteForEveryoneText[locale] : localizedDeleteChat[locale]}
          </span>
          <span className="block text-[13px] text-green-700">{subtitle}</span>
        </span>
      </button>

      <ArchiveChatConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleDeleteChat}
        isPending={deleteChatMutation.isPending}
        archivesForEveryone={isForEveryone}
      />
    </>
  );
};
