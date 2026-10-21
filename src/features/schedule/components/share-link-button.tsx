'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Share2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const shareLabel: StaticTranslationString = {
  en: 'Share link',
  de: 'Link teilen',
  fr: 'Partager le lien',
};

const copiedLabel: StaticTranslationString = {
  en: 'Link copied',
  de: 'Link kopiert',
  fr: 'Lien copié',
};

/** How long the copied confirmation stays up before the button goes back to offering the share. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Shares a link to a page of the app: the share sheet where there is one, the clipboard
 * everywhere else.
 */
export const ShareLinkButton: React.FC<{
  url: string;
  title: string;
  locale: Locale;
  /** a round button on its own, as over the map of a detail page: no "Link kopiert" text */
  compact?: boolean;
  className?: string;
}> = ({ url, title, locale, compact = false, className }) => {
  const [hasCopied, setHasCopied] = useState(false);

  const share = async (): Promise<void> => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title: `conveniat27 - ${title}`, text: title });
        return;
      } catch {
        // Dismissing the share sheet rejects exactly like a failure does, and falling back to the
        // clipboard there would copy a link the person had just decided not to send. Either way
        // there is nothing left to do: the share sheet was offered and is gone.
        return;
      }
    }

    // No share sheet - every desktop browser, and any context without the API. The clipboard is
    // the fallback rather than nothing at all.
    await navigator.clipboard.writeText(url);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={hasCopied ? copiedLabel[locale] : shareLabel[locale]}
      title={hasCopied ? copiedLabel[locale] : shareLabel[locale]}
      className={cn(
        'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900',
        className,
      )}
    >
      {hasCopied ? (
        <>
          <Check className="h-5 w-5 text-green-600" />
          {!compact && (
            <span className="text-xs font-medium text-green-600">{copiedLabel[locale]}</span>
          )}
        </>
      ) : (
        <Share2 className="h-5 w-5" />
      )}
    </button>
  );
};
