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
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

export const localizedDeleteChat: StaticTranslationString = {
  en: 'Delete Chat',
  de: 'Chat löschen',
  fr: 'Supprimer la discussion',
};

const localizedArchiveForEveryoneWarning: StaticTranslationString = {
  en:
    'The chat will be archived for all members: nobody can send messages in it anymore. ' +
    'It also disappears from your view. This cannot be undone.',
  de:
    'Der Chat wird für alle Mitglieder archiviert: Niemand kann darin mehr Nachrichten ' +
    'schreiben. Zudem verschwindet er aus deiner Chat-Ansicht. Das lässt sich nicht rückgängig machen.',
  fr:
    'La discussion sera archivée pour tous les membres : plus personne ne pourra y envoyer ' +
    'de messages. Elle disparaîtra aussi de votre vue. Cette action est irréversible.',
};

const localizedRemoveFromViewWarning: StaticTranslationString = {
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

const localizedCancel: StaticTranslationString = {
  en: 'Cancel',
  de: 'Abbrechen',
  fr: 'Annuler',
};

interface ArchiveChatConfirmDialogProperties {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  /**
   * Whether confirming archives the chat for every member. That is the case for any chat
   * that is not archived yet: `archiveChat` only hides an already archived chat.
   */
  archivesForEveryone: boolean;
}

/**
 * Confirms deleting a chat, shared by the delete button in the chat details and the swipe
 * in the chat overview so that neither can archive a chat for everybody by accident.
 */
export const ArchiveChatConfirmDialog: React.FC<ArchiveChatConfirmDialogProperties> = ({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  archivesForEveryone,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  return (
    <ChatAlertDialog open={open} onOpenChange={onOpenChange}>
      <ChatAlertDialogContent>
        <ChatAlertDialogHeader>
          <ChatAlertDialogTitle>{localizedDeleteChat[locale]}</ChatAlertDialogTitle>
          <ChatAlertDialogDescription>
            {archivesForEveryone
              ? localizedArchiveForEveryoneWarning[locale]
              : localizedRemoveFromViewWarning[locale]}
          </ChatAlertDialogDescription>
        </ChatAlertDialogHeader>
        <ChatAlertDialogFooter>
          <ChatAlertDialogCancel>{localizedCancel[locale]}</ChatAlertDialogCancel>
          <ChatAlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isPending && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {localizedDeleteChat[locale]}
          </ChatAlertDialogAction>
        </ChatAlertDialogFooter>
      </ChatAlertDialogContent>
    </ChatAlertDialog>
  );
};
