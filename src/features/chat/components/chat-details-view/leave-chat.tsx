'use client';
import { Button, buttonVariants } from '@/components/ui/buttons/button';
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
import { cn } from '@/utils/tailwindcss-override';
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
      <Button
        variant="outlined"
        size="touch"
        className="w-full"
        onClick={() => {
          leaveChatMutation.reset();
          setIsDialogOpen(true);
        }}
        disabled={leaveChatMutation.isPending}
      >
        <LogOut aria-hidden="true" />
        {localizedLeaveChat[locale]}
      </Button>

      <ChatAlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ChatAlertDialogContent className="border-line rounded-[14px] shadow-xl">
          <ChatAlertDialogHeader>
            <ChatAlertDialogTitle className="font-heading text-heading font-bold">
              {localizedLeaveChat[locale]}
            </ChatAlertDialogTitle>
            <ChatAlertDialogDescription className="text-[15px] text-green-700">
              {localizedLeaveChatWarning[locale]}
              {isLastOwner && ` ${localizedHandOverNotice[locale]}`}
            </ChatAlertDialogDescription>
            {leaveChatMutation.isError && (
              <p className="text-sm font-semibold text-green-900" role="alert">
                {errorText}
              </p>
            )}
          </ChatAlertDialogHeader>
          <ChatAlertDialogFooter className="gap-2 sm:space-x-0">
            <ChatAlertDialogCancel
              className={cn(buttonVariants({ variant: 'outlined', size: 'touch' }), 'shadow-none')}
            >
              {localizedCancel[locale]}
            </ChatAlertDialogCancel>
            <ChatAlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                leaveChatMutation.mutate({ chatUuid: chatId });
              }}
              disabled={leaveChatMutation.isPending}
              className={cn(buttonVariants({ variant: 'quiet', size: 'touch' }), 'shadow-none')}
            >
              {leaveChatMutation.isPending && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              {localizedLeaveChat[locale]}
            </ChatAlertDialogAction>
          </ChatAlertDialogFooter>
        </ChatAlertDialogContent>
      </ChatAlertDialog>
    </>
  );
};
