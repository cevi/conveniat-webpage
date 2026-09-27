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
} from '@/features/chat/components/ui/chat-alert-dialog';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useLeaveChatMutation } from '@/features/chat/hooks/use-leave-chat-mutation';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useState } from 'react';

const localizedLeaveChat: StaticTranslationString = {
  en: 'Leave chat',
  de: 'Chat verlassen',
  fr: 'Quitter la discussion',
};

const localizedLeaveChatWarning: StaticTranslationString = {
  en:
    'You will no longer receive or see the messages of this chat. The other members see ' +
    'that you left. An admin can add you again later.',
  de:
    'Du erhältst und siehst die Nachrichten dieses Chats nicht mehr. Die anderen Mitglieder ' +
    'sehen, dass du ihn verlassen hast. Ein Admin kann dich später wieder hinzufügen.',
  fr:
    'Vous ne recevrez et ne verrez plus les messages de cette discussion. Les autres membres ' +
    "verront que vous l'avez quittée. Un admin pourra vous y ajouter à nouveau plus tard.",
};

const localizedHandOverNotice: StaticTranslationString = {
  en: 'As you are its last owner, another member takes over the chat.',
  de: 'Da du den Chat als Letzte:r besitzt, übernimmt ein anderes Mitglied die Leitung.',
  fr: 'Comme vous en êtes le dernier propriétaire, un autre membre reprend la discussion.',
};

const localizedNoSuccessor: StaticTranslationString = {
  en: 'Nobody else in this chat can take it over. Delete the chat instead.',
  de: 'Niemand sonst in diesem Chat kann ihn übernehmen. Lösche den Chat stattdessen.',
  fr: 'Personne d’autre dans cette discussion ne peut la reprendre. Supprimez-la plutôt.',
};

const localizedLeaveFailed: StaticTranslationString = {
  en: 'Leaving the chat failed. Please try again.',
  de: 'Der Chat konnte nicht verlassen werden. Bitte versuche es erneut.',
  fr: 'Impossible de quitter la discussion. Veuillez réessayer.',
};

const localizedCancel: StaticTranslationString = {
  en: 'Cancel',
  de: 'Abbrechen',
  fr: 'Annuler',
};

/**
 * Lets any member of a group chat leave it, whatever their permission.
 */
export const LeaveChat: React.FC = () => {
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const leaveChatMutation = useLeaveChatMutation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: currentUser } = trpc.chat.user.useQuery({});
  const { data: chatDetails } = useChatDetail(chatId);
  const participants = chatDetails?.participants ?? [];
  const isOwner = participants.some(
    (p) => p.id === currentUser && p.chatPermission === ChatMembershipPermission.OWNER,
  );
  const isLastOwner =
    isOwner &&
    participants.length > 1 &&
    !participants.some(
      (p) => p.id !== currentUser && p.chatPermission === ChatMembershipPermission.OWNER,
    );

  const errorText =
    leaveChatMutation.error?.data?.code === 'PRECONDITION_FAILED'
      ? localizedNoSuccessor[locale]
      : localizedLeaveFailed[locale];

  return (
    <>
      <button
        onClick={() => {
          leaveChatMutation.reset();
          setIsDialogOpen(true);
        }}
        disabled={leaveChatMutation.isPending}
        className="w-full cursor-pointer rounded-md border border-red-600 px-4 py-2 text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
      >
        {localizedLeaveChat[locale]}
      </button>

      <ChatAlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ChatAlertDialogContent>
          <ChatAlertDialogHeader>
            <ChatAlertDialogTitle>{localizedLeaveChat[locale]}</ChatAlertDialogTitle>
            <ChatAlertDialogDescription>
              {localizedLeaveChatWarning[locale]}
              {isLastOwner && ` ${localizedHandOverNotice[locale]}`}
            </ChatAlertDialogDescription>
            {leaveChatMutation.isError && <p className="text-sm text-red-600">{errorText}</p>}
          </ChatAlertDialogHeader>
          <ChatAlertDialogFooter>
            <ChatAlertDialogCancel>{localizedCancel[locale]}</ChatAlertDialogCancel>
            <ChatAlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                leaveChatMutation.mutate({ chatUuid: chatId });
              }}
              disabled={leaveChatMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {leaveChatMutation.isPending && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {localizedLeaveChat[locale]}
            </ChatAlertDialogAction>
          </ChatAlertDialogFooter>
        </ChatAlertDialogContent>
      </ChatAlertDialog>
    </>
  );
};
