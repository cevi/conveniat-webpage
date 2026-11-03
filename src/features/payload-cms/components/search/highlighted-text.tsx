import { splitHighlights } from '@/features/payload-cms/search/search-text';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

/** The text with every searched word marked, so a reader sees why a result was found. */
export const HighlightedText: React.FC<{
  text: string;
  words: string[];
  /** on a brand-green surface, like the chosen row of the instant search */
  onDark?: boolean;
}> = ({ text, words, onDark = false }) => (
  <>
    {splitHighlights(text, words).map((part, index) =>
      part.isMatch ? (
        <mark
          key={index}
          className={cn(
            'rounded-[3px] px-px font-semibold',
            onDark ? 'bg-white/25 text-white' : 'bg-tint-line text-heading',
          )}
        >
          {part.text}
        </mark>
      ) : (
        <React.Fragment key={index}>{part.text}</React.Fragment>
      ),
    )}
  </>
);
