'use client';

import { ShareLinkButton } from '@/components/ui/buttons/share-link-button';
import { environmentVariables } from '@/config/environment-variables';
import type { Locale } from '@/types/types';
import type React from 'react';

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
  /** a round button on its own, as over the map of the detail page */
  compact?: boolean;
  className?: string;
}> = ({ shiftId, shiftTitle, locale, compact = false, className = '' }) => (
  <ShareLinkButton
    url={shareUrlForShift(shiftId)}
    title={shiftTitle}
    locale={locale}
    compact={compact}
    className={className}
  />
);
