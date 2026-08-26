'use client';

import { environmentVariables } from '@/config/environment-variables';
import type { Locale, StaticTranslationString } from '@/types/types';
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
 * A direct link to one helper shift.
 *
 * Built on the same `?id=` URL the card navigates to, so what gets shared is a page the app
 * already knows how to open - a helper who follows it lands on the shift itself rather than on
 * the feed with instructions to go looking.
 *
 * The host comes from `NEXT_PUBLIC_APP_HOST_URL` rather than from `location`, because the link is
 * meant to leave this device: a URL copied off `localhost` or off an IP on the camp WiFi is no
 * use to whoever receives it.
 */
export const shareUrlForShift = (shiftId: string): string =>
  `${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}/app/helper-portal?id=${shiftId}`;

export const ShiftShareButton: React.FC<{
  shiftId: string;
  shiftTitle: string;
  locale: Locale;
}> = ({ shiftId, shiftTitle, locale }) => {
  const [hasCopied, setHasCopied] = useState(false);

  const share = async (): Promise<void> => {
    const url = shareUrlForShift(shiftId);

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title: `conveniat27 - ${shiftTitle}`, text: shiftTitle });
        return;
      } catch {
        // Dismissing the share sheet rejects exactly like a failure does, and falling back to the
        // clipboard there would copy a link the helper had just decided not to send. Either way
        // there is nothing left to do: the share sheet was offered and is gone.
        return;
      }
    }

    // No share sheet - every desktop browser, and any context without the API. The clipboard is
    // the fallback rather than nothing at all, which is what the map's share button does today.
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
      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
    >
      {hasCopied ? (
        <>
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-xs font-medium text-green-600">{copiedLabel[locale]}</span>
        </>
      ) : (
        <Share2 className="h-5 w-5" />
      )}
    </button>
  );
};
