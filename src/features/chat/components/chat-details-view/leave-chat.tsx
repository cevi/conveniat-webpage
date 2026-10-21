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
import { Loader2, LogOut } from 'lucide-react';
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
 * The question before leaving a group chat, and the leaving. Reads the chat from the
 * surrounding `ChatIdProvider`, so the details and the chat list's actions ask the same.
 */
export const LeaveChatDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const chatId = useChatId();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const leaveChatMutation = useLeaveChatMutation();

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
    <ChatAlertDialog
      open={open}
      onOpenChange={(next) => {
        // a later opening starts without the error of this one
        if (!next) leaveChatMutation.reset();
        onOpenChange(next);
      }}
    >
      <ChatAlertDialogContent>
        <ChatAlertDialogHeader>
          <ChatAlertDialogTitle>{localizedLeaveChat[locale]}</ChatAlertDialogTitle>
          <ChatAlertDialogDescription>
            {localizedLeaveChatWarning[locale]}
            {isLastOwner && ` ${localizedHandOverNotice[locale]}`}
          </ChatAlertDialogDescription>
          {leaveChatMutation.isError && (
            <p className="text-sm font-semibold text-green-900" role="alert">
              {errorText}
            </p>
          )}
        </ChatAlertDialogHeader>
        <ChatAlertDialogFooter>
          <ChatAlertDialogCancel>{localizedCancel[locale]}</ChatAlertDialogCancel>
          <ChatAlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              leaveChatMutation.mutate(
                { chatUuid: chatId },
                // the details navigate away; the chat list stays, so the question has to close
                { onSuccess: () => onOpenChange(false) },
              );
            }}
            disabled={leaveChatMutation.isPending}
            variant="destructive"
          >
            {leaveChatMutation.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <LogOut aria-hidden="true" />
            )}
            {localizedLeaveChat[locale]}
          </ChatAlertDialogAction>
        </ChatAlertDialogFooter>
      </ChatAlertDialogContent>
    </ChatAlertDialog>
  );
};

/** A row of the actions card at the foot of the chat details. */
export const detailsActionRowClassName =
  'flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-page disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Lets any member of a group chat leave it, whatever their permission: a neutral row, as
 * leaving can be undone by an admin adding them again.
 */
export const LeaveChat: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={detailsActionRowClassName}
        onClick={() => setIsDialogOpen(true)}
      >
        <LogOut className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
        <span className="text-[15px] font-semibold text-green-900">
          {localizedLeaveChat[locale]}
        </span>
      </button>
      <LeaveChatDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
};
