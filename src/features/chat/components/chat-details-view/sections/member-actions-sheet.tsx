'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import type { DetailsParticipant } from '@/features/chat/components/chat-details-view/sections/participants-list';
import { destructiveButtonClassName } from '@/features/chat/components/ui/chat-alert-dialog';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Loader2, MessageCircle, UserMinus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const sendMessageText: StaticTranslationString = {
  de: 'Nachricht senden',
  en: 'Send message',
  fr: 'Envoyer un message',
};

const removeText: StaticTranslationString = {
  de: 'Aus Chat entfernen',
  en: 'Remove from chat',
  fr: 'Retirer du chat',
};

const removeConfirmText: StaticTranslationString = {
  de: '{name} sieht diesen Chat und seine Nachrichten danach nicht mehr. Ein Admin kann {name} später wieder hinzufügen.',
  en: '{name} will no longer see this chat and its messages. An admin can add {name} again later.',
  fr: '{name} ne verra plus ce chat ni ses messages. Un admin pourra {name} rajouter plus tard.',
};

const removeFailedText: StaticTranslationString = {
  de: 'Die Person konnte nicht entfernt werden. Bitte versuche es erneut.',
  en: 'The person could not be removed. Please try again.',
  fr: "La personne n'a pas pu être retirée. Veuillez réessayer.",
};

const cancelText: StaticTranslationString = {
  de: 'Abbrechen',
  en: 'Cancel',
  fr: 'Annuler',
};

const actionRowClassName =
  'flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 text-left text-[15px] font-semibold hover:bg-page';

/**
 * What a chat admin can do about another member: write to them, or take them out of the chat,
 * which asks first. Making someone an admin has no way in yet, see `ChatDetails`.
 */
export const MemberActionsSheet: React.FC<{
  participant: DetailsParticipant | undefined;
  onClose: () => void;
  /** Opens or starts the private chat; undefined for someone who is not among the contacts. */
  onSendMessage: (() => void) | undefined;
  /** Undefined where the person cannot be removed, such as the chat's owner. */
  onRemove: ((onDone: () => void) => void) | undefined;
  isRemoving: boolean;
  hasRemoveFailed: boolean;
  locale: Locale;
}> = ({ participant, onClose, onSendMessage, onRemove, isRemoving, hasRemoveFailed, locale }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const name = participant === undefined ? '' : splitDisplayName(participant.name).primary;
  const subtitle = [participant?.funktionLine, participant?.hofLine]
    .filter((line): line is string => line !== undefined && line !== '')
    .join(' · ');

  return (
    <BottomSheet
      open={participant !== undefined}
      onOpenChange={(open) => {
        if (open) return;
        setIsConfirming(false);
        onClose();
      }}
      title={name}
      {...(subtitle === '' ? {} : { description: subtitle })}
      leading={
        participant && (
          <PersonAvatar
            seed={participant.id}
            name={participant.name}
            pictureUrl={participant.pictureUrl}
            className="h-11 w-11 text-sm"
          />
        )
      }
    >
      {isConfirming && onRemove !== undefined ? (
        <div className="flex flex-col gap-3 pt-1">
          <p className="text-[15px] text-green-900">
            {removeConfirmText[locale].replaceAll('{name}', name)}
          </p>
          {hasRemoveFailed && (
            <p className="text-danger-text text-sm font-semibold" role="alert">
              {removeFailedText[locale]}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              className={cn(destructiveButtonClassName, 'w-full')}
              disabled={isRemoving}
              onClick={() =>
                onRemove(() => {
                  setIsConfirming(false);
                  onClose();
                })
              }
            >
              {isRemoving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <UserMinus aria-hidden="true" />
              )}
              {removeText[locale]}
            </Button>
            <Button variant="quiet" size="touch" onClick={() => setIsConfirming(false)}>
              {cancelText[locale]}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="-mx-3 flex flex-col">
          {onSendMessage !== undefined && (
            <li>
              <button
                type="button"
                onClick={onSendMessage}
                className={cn(actionRowClassName, 'text-green-900')}
              >
                <MessageCircle className="h-5 w-5 text-green-700" aria-hidden="true" />
                {sendMessageText[locale]}
              </button>
            </li>
          )}
          {onRemove !== undefined && (
            <li>
              <button
                type="button"
                onClick={() => setIsConfirming(true)}
                className={cn(actionRowClassName, 'text-danger-text hover:bg-danger-soft')}
              >
                <UserMinus className="h-5 w-5" aria-hidden="true" />
                {removeText[locale]}
              </button>
            </li>
          )}
        </ul>
      )}
    </BottomSheet>
  );
};
