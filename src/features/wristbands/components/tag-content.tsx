import { environmentVariables } from '@/config/environment-variables';
import { GuestTagView } from '@/features/wristbands/components/guest-tag-view';
import { TagView } from '@/features/wristbands/components/tag-view';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { DesignCodes } from '@/utils/design-codes';
import { notFound } from 'next/navigation';
import type React from 'react';

/** The UID a band carries in its URL: 7 bytes in hex, as the chip mirrors it. */
const BAND_UID = /^[0-9A-Fa-f]{14}$/;

/**
 * What a tapped band shows, the same in the sheet over the open page and on the page a cold
 * tap loads: `https://conveniat27.ch/tag/{uid}`. Bands are read only signed in: a guest gets the
 * login, which returns to the band, and nothing about it; whoever is signed in sees what the
 * server lets them see, see `TagView`. Anything that is not a UID is not a band.
 */
export const TagContent: React.FC<{
  params: Promise<{ uid: string; locale: Locale; design: DesignCodes }>;
}> = async ({ params }) => {
  const { uid, locale, design } = await params;
  // the sheet over a page has no layout of its own to check the flag
  if (!environmentVariables.FEATURE_ENABLE_NFC_WRISTBANDS || !BAND_UID.test(uid)) notFound();
  const bandUid = uid.toUpperCase();

  const session = await auth();
  if (!isValidNextAuthUser(session?.user)) {
    // German is served without a prefix, the other locales keep theirs
    const prefix = locale === i18nConfig.defaultLocale ? '' : `/${locale}`;
    return (
      <GuestTagView
        inAppDesign={design === DesignCodes.APP_DESIGN}
        callbackUrl={`${prefix}/tag/${bandUid}`}
      />
    );
  }
  return <TagView uid={bandUid} />;
};
