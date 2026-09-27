'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Info, MessageSquare, Quote, SmilePlus } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/** The reaction set most chat apps settled on; more choice makes the common case slower. */
export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

/** Shown straight away in the hover toolbar; the rest is one click behind "more". */
const HOVER_EMOJIS = QUICK_EMOJIS.slice(0, 3);

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

const moreReactionsText: StaticTranslationString = {
  de: 'Weitere Reaktionen',
  en: 'More reactions',
  fr: 'Plus de réactions',
};

const reactionsText: StaticTranslationString = {
  de: 'Reaktionen',
  en: 'Reactions',
  fr: 'Réactions',
};

const quoteText: StaticTranslationString = {
  de: 'Zitieren',
  en: 'Quote',
  fr: 'Citer',
};

const replyText: StaticTranslationString = {
  de: 'Im Thread antworten',
  en: 'Reply in thread',
  fr: 'Répondre dans le fil',
};

const infoText: StaticTranslationString = {
  de: 'Info',
  en: 'Message info',
  fr: 'Infos message',
};

const stop = (event: React.SyntheticEvent): void => {
  event.preventDefault();
  event.stopPropagation();
};

interface EmojiButtonProperties {
  emoji: string;
  hasReacted: boolean;
  locale: Locale;
  onReact: (emoji: string) => void;
  size: 'touch' | 'pointer';
}

const EmojiButton: React.FC<EmojiButtonProperties> = ({
  emoji,
  hasReacted,
  locale,
  onReact,
  size,
}) => (
  <button
    type="button"
    onClick={(event) => {
      stop(event);
      onReact(emoji);
    }}
    aria-label={emojiNames[emoji]?.[locale] ?? emoji}
    aria-pressed={hasReacted}
    title={emojiNames[emoji]?.[locale]}
    className={cn(
      'flex cursor-pointer items-center justify-center rounded-full transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:scale-90',
      // 44 px under a finger (Apple HIG), 32 px under a mouse
      size === 'touch' ? 'h-11 w-11 text-[1.6rem]' : 'h-8 w-8 text-lg hover:scale-125',
      hasReacted ? 'bg-blue-100' : size === 'pointer' && 'hover:bg-gray-100',
    )}
  >
    {emoji}
  </button>
);

interface ReactionBarProperties {
  reactedEmojis: ReadonlySet<string>;
  isCurrentUser: boolean;
  /** Opens under the bubble instead of over it, when there is no room above. */
  placeBelow: boolean;
  locale: Locale;
  onReact: (emoji: string) => void;
}

/**
 * Touch: the emoji row a long-press opens, anchored to the bubble's own side so it grows
 * into the free width instead of off the screen. Quote, thread and info live in the
 * selection header at the top, as in WhatsApp, so this row carries only reactions.
 */
export const ReactionBar: React.FC<ReactionBarProperties> = ({
  reactedEmojis,
  isCurrentUser,
  placeBelow,
  locale,
  onReact,
}) => (
  <div
    role="toolbar"
    aria-label={reactionsText[locale]}
    onPointerDown={(event) => event.stopPropagation()}
    className={cn(
      'animate-in fade-in zoom-in-90 absolute z-40 flex items-center gap-0.5 rounded-full bg-white p-1 shadow-lg ring-1 ring-gray-200 duration-150',
      placeBelow ? 'top-full mt-2' : 'bottom-full mb-2',
      isCurrentUser ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left',
    )}
  >
    {QUICK_EMOJIS.map((emoji) => (
      <EmojiButton
        key={emoji}
        emoji={emoji}
        hasReacted={reactedEmojis.has(emoji)}
        locale={locale}
        onReact={onReact}
        size="touch"
      />
    ))}
  </div>
);

interface HoverToolbarProperties {
  reactedEmojis: ReadonlySet<string>;
  isCurrentUser: boolean;
  canReact: boolean;
  canQuote: boolean;
  canThread: boolean;
  locale: Locale;
  onReact: (emoji: string) => void;
  onQuote: () => void;
  onThread: () => void;
  onInfo: () => void;
}

const ToolbarAction: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled = false, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={(event) => {
      stop(event);
      onClick();
    }}
    aria-label={label}
    title={label}
    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-35"
  >
    {children}
  </button>
);

/**
 * Mouse: a small toolbar pinned to the top corner of the hovered bubble, on the side that
 * faces the middle of the chat. Three reactions are one click away, the other three behind
 * "more", so the bar stays narrow enough never to reach the edge of the column.
 */
export const HoverToolbar: React.FC<HoverToolbarProperties> = ({
  reactedEmojis,
  isCurrentUser,
  canReact,
  canQuote,
  canThread,
  locale,
  onReact,
  onQuote,
  onThread,
  onInfo,
}) => {
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const emojis = showAllEmojis ? QUICK_EMOJIS : HOVER_EMOJIS;

  return (
    <div
      role="toolbar"
      className={cn(
        'animate-in fade-in absolute -top-5 z-40 flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md ring-1 ring-gray-200 duration-100',
        isCurrentUser ? 'right-2' : 'left-2',
      )}
    >
      {canReact && (
        <>
          {emojis.map((emoji) => (
            <EmojiButton
              key={emoji}
              emoji={emoji}
              hasReacted={reactedEmojis.has(emoji)}
              locale={locale}
              onReact={onReact}
              size="pointer"
            />
          ))}
          {!showAllEmojis && (
            <ToolbarAction label={moreReactionsText[locale]} onClick={() => setShowAllEmojis(true)}>
              <SmilePlus className="h-4 w-4" />
            </ToolbarAction>
          )}
          <div className="mx-0.5 h-4 w-px bg-gray-200" aria-hidden="true" />
        </>
      )}
      <ToolbarAction label={quoteText[locale]} onClick={onQuote} disabled={!canQuote}>
        <Quote className="h-4 w-4" />
      </ToolbarAction>
      {canThread && (
        <ToolbarAction label={replyText[locale]} onClick={onThread}>
          <MessageSquare className="h-4 w-4" />
        </ToolbarAction>
      )}
      <ToolbarAction label={infoText[locale]} onClick={onInfo}>
        <Info className="h-4 w-4" />
      </ToolbarAction>
    </div>
  );
};
