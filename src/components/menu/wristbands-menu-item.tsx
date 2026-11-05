'use client';

import type { AppFeaturesVariant } from '@/components/menu/app-feature-menu-item';
import { AppFeatureMenuItem } from '@/components/menu/app-feature-menu-item';
import { useWristbandAccess } from '@/hooks/use-wristband-access';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Nfc } from 'lucide-react';
import type React from 'react';

const wristbandsFeatureTranslation: StaticTranslationString = {
  en: 'Wristbands',
  de: 'Armbänder',
  fr: 'Bracelets',
};

/**
 * The menu's way to the NFC wristbands, for the AVP who programs the bands of a Hof and for
 * security and first aid, who read them; nobody else sees it. The menu is rendered on the
 * server without the session, so the item asks itself, see `useWristbandAccess`.
 */
export const WristbandsMenuItem: React.FC<{
  variant: AppFeaturesVariant;
  locale: Locale;
  /** whether the deployment turned the wristbands on, `FEATURE_ENABLE_NFC_WRISTBANDS` */
  enabled: boolean;
}> = ({ variant, locale, enabled }) => {
  const access = useWristbandAccess(enabled);
  if (access === undefined) return <></>;

  return (
    <AppFeatureMenuItem
      variant={variant}
      href="/app/wristbands"
      Icon={Nfc}
      text={wristbandsFeatureTranslation[locale]}
    />
  );
};
