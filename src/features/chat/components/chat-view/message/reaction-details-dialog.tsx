import { DialogDescription } from '@/components/ui/dialog';
import {
  ChatDialog,
  ChatDialogContent,
  ChatDialogHeader,
  ChatDialogTitle,
} from '@/features/chat/components/ui/chat-dialog';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const reactionsText: StaticTranslationString = {
  de: 'Reaktionen',
  en: 'Reactions',
  fr: 'Réactions',
};

const descriptionText: StaticTranslationString = {
  de: 'Wer wie auf die Nachricht reagiert hat',
  en: 'Who reacted to the message, and how',
  fr: 'Qui a réagi au message, et comment',
};

const youText: StaticTranslationString = {
  de: 'Du',
  en: 'You',
  fr: 'Vous',
};

export interface ReactionGroup {
  emoji: string;
  users: { id: string; name: string }[];
}

/**
 * Lists who reacted to a message with which emoji. On a phone the names are otherwise nowhere to
 * be seen, since the badge's tooltip needs a mouse.
 */
export const ReactionDetailsDialog: React.FC<{
  groups: ReactionGroup[];
  currentUserId: string | undefined;
  locale: Locale;
  onClose: () => void;
}> = ({ groups, currentUserId, locale, onClose }) => (
  <ChatDialog open onOpenChange={(open) => !open && onClose()}>
    <ChatDialogContent className="sm:max-w-md">
      <ChatDialogHeader>
        <ChatDialogTitle>{reactionsText[locale]}</ChatDialogTitle>
        <DialogDescription className="sr-only">{descriptionText[locale]}</DialogDescription>
      </ChatDialogHeader>
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
        {groups.flatMap((group) =>
          group.users.map((reactor) => (
            <li
              key={`${group.emoji}-${reactor.id}`}
              className="flex items-center gap-3 border-b border-gray-100 pb-2"
            >
              <span className="text-xl">{group.emoji}</span>
              <span className="font-body flex-1 text-sm text-gray-700">
                {reactor.id === currentUserId ? youText[locale] : reactor.name}
              </span>
            </li>
          )),
        )}
      </ul>
    </ChatDialogContent>
  </ChatDialog>
);
