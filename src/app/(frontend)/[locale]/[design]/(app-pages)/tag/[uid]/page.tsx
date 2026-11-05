import { GuestTagView } from '@/features/wristbands/components/guest-tag-view';
import { TagView } from '@/features/wristbands/components/tag-view';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { DesignCodes } from '@/utils/design-codes';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type React from 'react';

const tabTitle: StaticTranslationString = {
  de: 'Armband',
  en: 'Wristband',
  fr: 'Bracelet',
};

/** The UID a band carries in its URL: 7 bytes in hex, as the chip mirrors it. */
const BAND_UID = /^[0-9A-Fa-f]{14}$/;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  // never indexed: the address names a person's band
  return { title: tabTitle[locale], robots: { index: false, follow: false } };
};

/**
 * The page a band opens when someone taps it with a phone: `https://conveniat27.ch/tag/{uid}`.
 * Bands are read only signed in: a guest gets the login, which returns here, and nothing about
 * the band; whoever is signed in sees what the server lets them see, see `TagView`. Anything that is not a UID is not a
 * band.
 */
const TagPage: React.FC<{
  params: Promise<{ uid: string; locale: Locale; design: DesignCodes }>;
}> = async ({ params }) => {
  const { uid, locale, design } = await params;
  if (!BAND_UID.test(uid)) notFound();
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

export default TagPage;
