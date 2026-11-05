'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { tagText } from '@/features/wristbands/tag-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

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
