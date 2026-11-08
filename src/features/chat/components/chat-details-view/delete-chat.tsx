'use client';
import { ListRow } from '@/components/ui/list-row';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { usePendingChatDeletionContext } from '@/features/chat/context/pending-chat-deletion-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useUpdateChatMutation } from '@/features/chat/hooks/use-update-chat-mutation';
import { useUserCanArchiveChat } from '@/features/chat/hooks/use-user-can-archive';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { isChatArchived } from '@/lib/chat-shared';
import { ChatMembershipPermission } from '@/lib/prisma/enums';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
const localizedRoleNames: Record<ChatMembershipPermission, StaticTranslationString> = {
  [ChatMembershipPermission.OWNER]: { en: 'Owner', de: 'Besitzer/-in', fr: 'Propriétaire' },
  [ChatMembershipPermission.ADMIN]: { en: 'Admin', de: 'Admin', fr: 'Admin' },
  [ChatMembershipPermission.MEMBER]: { en: 'Member', de: 'Mitglied', fr: 'Membre' },
  [ChatMembershipPermission.GUEST]: { en: 'Guest', de: 'Gast', fr: 'Invité' },
};

const localizedDeleteChat: StaticTranslationString = {
  en: 'Delete Chat',
  de: 'Chat löschen',
  fr: 'Supprimer la discussion',
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
    de: `Nur Admins und Besitzer/-innen können diesen Chat löschen. Deine Rolle: ${roleName}.`,
    fr: `Seuls les admins et propriétaires peuvent supprimer cette discussion. Votre rôle: ${roleName}.`,
  };
  return explanations[locale];
};

export const DeleteChat: React.FC = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { deleteChat } = usePendingChatDeletionContext();
  const updateChatMutation = useUpdateChatMutation();

  const canUserArchiveChat = useUserCanArchiveChat(chatId);

  // Get user's current role in this chat
  const { data: currentUser } = useQuery(trpc.chat.user.queryOptions({}));
  const { data: chatDetails } = useChatDetail(chatId);
  const currentUserMembership = chatDetails?.participants.find((p) => p.id === currentUser);
  const userRole = currentUserMembership?.chatPermission ?? ChatMembershipPermission.GUEST;

  const isForEveryone = chatDetails === undefined || !isChatArchived(chatDetails);
  const participantCount = chatDetails?.participants.length ?? 0;
  let subtitle = getCannotDeleteExplanation(userRole, locale);
  if (canUserArchiveChat) {
    subtitle = isForEveryone
      ? historyGoneText(participantCount, locale)
      : localizedRemoveFromViewText[locale];
  }

  // no question first: back on the list, the chat is gone with a moment to undo, as on a swipe
  const handleDeleteChat = (): void => {
    deleteChat({ chatId, forEveryone: isForEveryone });
    router.push('/app/chat');
  };

  return (
    // red: it deletes the chat for everybody, and it says so
    <ListRow
      tone="danger"
      className="disabled:opacity-60"
      onClick={handleDeleteChat}
      disabled={!canUserArchiveChat || updateChatMutation.isPending}
    >
      <Trash2 className="text-danger-text h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="text-danger-text block text-[15px] font-semibold">
          {isForEveryone ? deleteForEveryoneText[locale] : localizedDeleteChat[locale]}
        </span>
        <span className="block text-[13px] text-green-700">{subtitle}</span>
      </span>
    </ListRow>
  );
};
