'use client';

import { Button } from '@/components/ui/buttons/button';
import { CHAT_DELETION_UNDO_MS } from '@/features/chat/hooks/use-pending-chat-deletion';
import type { Locale, StaticTranslationString } from '@/types/types';
import { motion, useReducedMotion } from 'framer-motion';
import { Trash2, Undo2 } from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';

const chatDeletedText: StaticTranslationString = {
  de: 'Chat gelöscht',
  en: 'Chat deleted',
  fr: 'Chat supprimé',
};

// the same verb as the button in the details that does it, see `DeleteChat`
const chatDeletedForEveryoneText: StaticTranslationString = {
  de: 'Chat für alle gelöscht',
  en: 'Chat deleted for everyone',
  fr: 'Chat supprimé pour tout le monde',
};

const undoText: StaticTranslationString = {
  de: 'Rückgängig',
  en: 'Undo',
  fr: 'Annuler',
};

/**
 * Whether the user is on the banner, with a finger, a pointer or the keyboard focus. A touch is a
 * pointer too, so enter and leave cover it. `onHold` hears only the changes, and `releases`
 * counts how often the user let go, to start the line over.
 */
const useBannerHold = (
  onHold: (held: boolean) => void,
): {
  held: boolean;
  releases: number;
  handlers: Pick<
    React.HTMLAttributes<HTMLDivElement>,
    'onPointerEnter' | 'onPointerLeave' | 'onFocus' | 'onBlur'
  >;
} => {
  const [held, setHeld] = useState(false);
  const [releases, setReleases] = useState(0);
  const sources = useRef({ pointer: false, focus: false });

  const update = (source: 'pointer' | 'focus', value: boolean): void => {
    sources.current[source] = value;
    const next = sources.current.pointer || sources.current.focus;
    if (next === held) return;
    setHeld(next);
    if (!next) setReleases((count) => count + 1);
    onHold(next);
  };

  return {
    held,
    releases,
    handlers: {
      onPointerEnter: () => update('pointer', true),
      onPointerLeave: () => update('pointer', false),
      onFocus: () => update('focus', true),
      onBlur: (event): void => {
        if (!event.currentTarget.contains(event.relatedTarget)) update('focus', false);
      },
    },
  };
};

/**
 * Tells that a chat was deleted and offers to take it back while the delete waits, see
 * `usePendingChatDeletion`. It takes the place of "Neuer Chat" above the tab bar on a phone. On a
 * desktop it sticks to the bottom of the list's scrolling part, so it never covers what stands
 * under the list, like the card that leads to the app. The line along its bottom runs out with
 * the time left, stays full while the user is on the banner and starts over when they leave it.
 * Give the banner the chat's id as `key`, so another chat starts it over too.
 */
export const ChatDeletedBanner: React.FC<{
  /** says the chat is gone for every member, not only from the user's list */
  forEveryone: boolean;
  onUndo: () => void;
  onHold: (held: boolean) => void;
  locale: Locale;
}> = ({ forEveryone, onUndo, onHold, locale }) => {
  const reduceMotion = useReducedMotion() ?? false;
  const { held, releases, handlers } = useBannerHold(onHold);

  return (
    <div
      role="status"
      {...handlers}
      className="bg-quiet border-line fixed inset-x-4 bottom-[calc(var(--app-tab-bar-height)+16px)] z-30 mx-auto flex min-h-[52px] max-w-md items-center gap-3 overflow-hidden rounded-[14px] border py-1 pr-1 pl-4 shadow-lg xl:sticky xl:inset-x-auto xl:bottom-4 xl:mx-0 xl:max-w-none"
    >
      <Trash2 className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
      {/* a longer text wraps rather than squeezing the button */}
      <span className="min-w-0 flex-1 text-[15px] leading-5 text-green-900">
        {(forEveryone ? chatDeletedForEveryoneText : chatDeletedText)[locale]}
      </span>
      <Button variant="outlined" size="touch" className="shrink-0" onClick={onUndo}>
        <Undo2 aria-hidden="true" />
        {undoText[locale]}
      </Button>
      {!reduceMotion &&
        (held ? (
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-green-400" />
        ) : (
          <motion.div
            key={releases}
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-green-400"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: CHAT_DELETION_UNDO_MS / 1000, ease: 'linear' }}
          />
        ))}
    </div>
  );
};
