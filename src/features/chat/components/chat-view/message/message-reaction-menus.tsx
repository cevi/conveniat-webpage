'use client';

import { useLongPress } from '@/features/chat/hooks/use-long-press';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/** The reaction set most chat apps settled on; more choice makes the common case slower. */
export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

export const emojiNames: Record<string, StaticTranslationString> = {
  '👍': { de: 'Gefällt mir', en: 'Like', fr: "J'aime" },
  '👎': { de: 'Gefällt mir nicht', en: 'Dislike', fr: "Je n'aime pas" },
  '❤️': { de: 'Liebe', en: 'Love', fr: 'Amour' },
  '😂': { de: 'Lachen', en: 'Laugh', fr: 'Rire' },
  '😮': { de: 'Staunen', en: 'Wow', fr: 'Surpris' },
  '😢': { de: 'Traurig', en: 'Sad', fr: 'Triste' },
  '🙏': { de: 'Bitte / Danke', en: 'Please / Thank you', fr: "S'il vous plaît / Merci" },
  '🎉': { de: 'Feiern', en: 'Celebrate', fr: 'Célébrer' },
};

const clickToRemoveText: StaticTranslationString = {
  de: 'Klicken zum Entfernen',
  en: 'Click to remove',
  fr: 'Cliquer pour supprimer',
};

interface ReactionBadgeProperties {
  emoji: string;
  userNames: string[];
  hasReacted: boolean;
  canReact: boolean;
  locale: Locale;
  onToggle: () => void;
  /** Opens the list of who reacted; a held press, a right click or the context-menu key. */
  onShowReactors: () => void;
}

/**
 * One emoji under a bubble with the number of people who picked it. A tap toggles the own
 * reaction, holding it lists the names.
 */
export const ReactionBadge: React.FC<ReactionBadgeProperties> = ({
  emoji,
  userNames,
  hasReacted,
  canReact,
  locale,
  onToggle,
  onShowReactors,
}) => {
  const longPress = useLongPress(onShowReactors);
  const names = userNames.join(', ');

  return (
    <button
      type="button"
      {...longPress}
      // the bubble around the badge opens its own sheet on these; the badge answers them itself
      onPointerDown={(event) => {
        event.stopPropagation();
        longPress.onPointerDown(event);
      }}
      onContextMenu={(event) => {
        event.stopPropagation();
        longPress.onContextMenu(event);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        longPress.onKeyDown(event);
      }}
      onClick={(event) => {
        // the bubble would otherwise toggle its time
        event.stopPropagation();
        if (canReact) onToggle();
      }}
      aria-label={`${emojiNames[emoji]?.[locale] ?? emoji}: ${names}`}
      aria-pressed={hasReacted}
      className={cn(
        'flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-150 active:scale-95',
        hasReacted
          ? 'border-tint-line bg-tint text-green-900'
          : 'border-line hover:bg-quiet bg-white text-green-700',
      )}
      title={
        hasReacted ? `${names === '' ? '' : names + '\n'}(${clickToRemoveText[locale]})` : names
      }
    >
      <span>{emoji}</span>
      <span className="font-semibold">{userNames.length}</span>
    </button>
  );
};
