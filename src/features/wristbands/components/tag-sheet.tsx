'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { isBandLink } from '@/features/wristbands/band-link';
import { tagText } from '@/features/wristbands/tag-texts';
import { claimAppLinks } from '@/hooks/use-app-webview-navigate';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';

/**
 * Another band tapped while this sheet is open takes its place, so there is never a second sheet
 * of a band: over a page the router swaps the sheet without a step back to the last band; the
 * page of a cold tap, which the router would cover with a sheet, loads the new band as its page.
 */
const useNextBandReplacesSheet = (closeTo: 'back' | 'home'): void => {
  const router = useRouter();
  useEffect(
    () =>
      claimAppLinks((target) => {
        if (!isBandLink(target)) return false;
        if (closeTo === 'home') globalThis.location.replace(target.href);
        else router.replace(`${target.pathname}${target.search}${target.hash}`);
        return true;
      }),
    [closeTo, router],
  );
};

/**
 * The sheet a tapped band opens in. Over the page the band was tapped on it closes with the
 * back navigation, which leaves that page as it was; on a cold tap there is no page behind it,
 * so it goes to Home instead.
 */
export const TagSheet: React.FC<{
  /** `back` over the open page, `home` on the page a cold tap loads */
  closeTo: 'back' | 'home';
  children: React.ReactNode;
}> = ({ closeTo, children }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  // closed at once, while the router is still on its way
  const [open, setOpen] = useState(true);
  useNextBandReplacesSheet(closeTo);

  const close = (): void => {
    setOpen(false);
    if (closeTo === 'back') router.back();
    else router.replace('/app/dashboard');
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={tagText('sheetTitle', locale)}
      // a band read again brings its Hof and the contacts: the sheet keeps its height, so
      // nothing already on it moves
      fullHeight
    >
      {children}
    </BottomSheet>
  );
};
