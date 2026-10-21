'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const reactionsText: StaticTranslationString = {
  de: 'Reaktionen',
  en: 'Reactions',
  fr: 'Réactions',
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
  <BottomSheet open onOpenChange={(open) => !open && onClose()} title={reactionsText[locale]}>
    <ul className="divide-line divide-y">
      {groups.flatMap((group) =>
        group.users.map((reactor) => (
          <li key={`${group.emoji}-${reactor.id}`} className="flex min-h-12 items-center gap-3">
            <span className="text-xl">{group.emoji}</span>
            <span className="flex-1 text-[15px] text-green-900">
              {reactor.id === currentUserId ? youText[locale] : reactor.name}
            </span>
          </li>
        )),
      )}
    </ul>
  </BottomSheet>
);
