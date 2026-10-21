'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Share2, X } from 'lucide-react';
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

const copyFailedLabel: StaticTranslationString = {
  en: 'Could not copy the link',
  de: 'Link nicht kopiert',
  fr: 'Lien non copié',
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
  /** says "Link teilen" next to the icon, for a row of labelled actions */
  withLabel?: boolean;
  className?: string;
}> = ({ url, title, locale, compact = false, withLabel = false, className }) => {
  const [feedback, setFeedback] = useState<'copied' | 'failed'>();

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
    // The clipboard is missing outside a secure context and may refuse the write; say so rather
    // than look as if nothing was tapped.
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('copied');
    } catch {
      setFeedback('failed');
    }
    setTimeout(() => setFeedback(undefined), COPIED_FEEDBACK_MS);
  };

  let currentLabel = shareLabel[locale];
  if (feedback === 'copied') currentLabel = copiedLabel[locale];
  if (feedback === 'failed') currentLabel = copyFailedLabel[locale];
  // a labelled button is named by its text; an icon alone needs the name spelled out
  const iconOnlyLabel = withLabel ? undefined : currentLabel;

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={iconOnlyLabel}
      title={currentLabel}
      className={cn(
        'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900',
        className,
      )}
    >
      {feedback === undefined ? (
        <>
          <Share2 className="h-5 w-5" aria-hidden="true" />
          {withLabel && <span>{shareLabel[locale]}</span>}
        </>
      ) : (
        <>
          {feedback === 'copied' ? (
            <Check className="h-5 w-5 text-green-600" aria-hidden="true" />
          ) : (
            <X className="text-live-text h-5 w-5" aria-hidden="true" />
          )}
          {!compact && (
            <span
              role="status"
              className={cn(
                withLabel ? '' : 'text-xs font-medium',
                feedback === 'copied' ? 'text-green-700' : 'text-live-text',
              )}
            >
              {currentLabel}
            </span>
          )}
        </>
      )}
    </button>
  );
};
