import { AppFeatureLink } from '@/components/menu/app-feature-link';
import { appFeaturesTitle } from '@/components/menu/app-features-title';
import { environmentVariables } from '@/config/environment-variables';
import { getAppFeatureFlagsCached } from '@/features/payload-cms/api/cached-globals';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarCheck2,
  ImageUp,
  LucideMessageCircleQuestion,
  Map,
  MessageSquare,
  Package,
  Settings,
  Siren,
  Trophy,
  Truck,
} from 'lucide-react';
import { io } from 'next/cache';
import type React from 'react';

const chatFeatureTranslation: StaticTranslationString = {
  en: 'Chat',
  de: 'Chat',
  fr: 'Chat',
};

const qaForumFeatureTranslation: StaticTranslationString = {
  en: 'conveniat27 Forum',
  de: 'conveniat27 Forum',
  fr: 'Forum conveniat27',
};

const emergencyInfoFeatureTranslation: StaticTranslationString = {
  en: 'Emergency Information',
  de: 'Notfallinformationen',
  fr: "Informations d'urgence",
};

const campMapFeatureTranslation: StaticTranslationString = {
  en: 'Campsite Map',
  de: 'Lagerplatz Karte',
  fr: 'Carte du terrain de camp',
};

const scheduleFeatureTranslation: StaticTranslationString = {
  en: 'Programm and Story',
  de: 'Programm und Geschichte',
  fr: 'Programme et histoire',
};

const helperShiftsFeatureTranslation: StaticTranslationString = {
  en: 'Helper Shifts',
  de: 'Schichteinsätze',
  fr: 'Services de helpers',
};

const photoContestFeatureTranslation: StaticTranslationString = {
  en: 'Photo Contest',
  de: 'Foto-Wettbewerb',
  fr: 'Concours Photo',
};

const uploadPicturesFeatureTranslation: StaticTranslationString = {
  en: 'Upload Pictures',
  de: 'Bilder hochladen',
  fr: 'Télécharger des photos',
};

const reservationsFeatureTranslation: StaticTranslationString = {
  en: 'Reservations',
  de: 'Reservationen',
  fr: 'Réservations',
};

const materialFeatureTranslation: StaticTranslationString = {
  en: 'Material depot',
  de: 'Materialdepot',
  fr: 'Dépôt de matériel',
};

const settingsFeatureTranslation: StaticTranslationString = {
  en: 'Settings',
  de: 'Einstellungen',
  fr: 'Paramètres',
};

/** in the menu drawer of a phone, or as a column of the menu the desktop's header opens */
type AppFeaturesVariant = 'drawer' | 'column';

interface AppFeatureMenuItemProperties {
  href: string;
  Icon: LucideIcon;
  text: string;
  openInNewTab?: boolean;
  prefetch?: boolean;
}

const itemClassName: Record<AppFeaturesVariant, string> = {
  drawer:
    'closeNavOnClick -mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-700 hover:bg-gray-50',
  // like the links of the website's columns next to it
  column:
    'hover:bg-tint text-heading flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-[16px] leading-snug font-semibold [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-green-500 group-aria-[current=page]/feature:bg-conveniat-green group-aria-[current=page]/feature:text-white group-aria-[current=page]/feature:[&_svg]:text-white',
};

const AppFeatureMenuItem: React.FC<
  AppFeatureMenuItemProperties & { variant: AppFeaturesVariant }
> = ({ href, Icon, text, openInNewTab = false, prefetch, variant }) => {
  return (
    <AppFeatureLink
      href={href}
      openInNewTab={openInNewTab}
      {...(prefetch === undefined ? {} : { prefetch })}
    >
      <span className={itemClassName[variant]}>
        <Icon aria-hidden="true" className="size-5" />
        {text}
      </span>
    </AppFeatureLink>
  );
};

export const AppFeatures: React.FC<{
  locale: Locale;
  variant?: AppFeaturesVariant;
}> = async ({ locale, variant = 'drawer' }) => {
  // `io()`, not `connection()`: both stop the build-time prerender before the DB read,
  // but `connection()` never resolves for a prefetch. This subtree holds the app feature
  // <Link>s, so a `connection()` here made every one of them permanently unprefetchable
  // and drove an endless runtime-prefetch retry loop.
  await io();
  const featureFlags = await getAppFeatureFlagsCached();

  const items = (
    <>
      <AppFeatureMenuItem
        variant={variant}
        href="/app/chat"
        Icon={MessageSquare}
        text={chatFeatureTranslation[locale]}
        prefetch
      />
      {featureFlags.forumEnabled !== false && (
        <AppFeatureMenuItem
          variant={variant}
          href="/app/forum"
          Icon={LucideMessageCircleQuestion}
          text={qaForumFeatureTranslation[locale]}
        />
      )}
      <AppFeatureMenuItem
        variant={variant}
        href="/app/emergency"
        Icon={Siren}
        text={emergencyInfoFeatureTranslation[locale]}
        prefetch
      />
      <AppFeatureMenuItem
        variant={variant}
        href="/app/map"
        Icon={Map}
        text={campMapFeatureTranslation[locale]}
        prefetch
      />
      <AppFeatureMenuItem
        variant={variant}
        href="/app/schedule"
        Icon={Calendar}
        text={scheduleFeatureTranslation[locale]}
        prefetch
      />
      {featureFlags.helperShiftsEnabled !== false && (
        <AppFeatureMenuItem
          variant={variant}
          href="/app/helper-portal"
          Icon={CalendarCheck2}
          text={helperShiftsFeatureTranslation[locale]}
        />
      )}
      {featureFlags.imageUploadEnabled !== false && (
        <AppFeatureMenuItem
          variant={variant}
          href="/app/upload-images"
          Icon={ImageUp}
          text={uploadPicturesFeatureTranslation[locale]}
        />
      )}
      {featureFlags.photoContestEnabled !== false && (
        <AppFeatureMenuItem
          variant={variant}
          href="/app/photo-contest"
          Icon={Trophy}
          text={photoContestFeatureTranslation[locale]}
        />
      )}
      {featureFlags.reservationsEnabled !== false && (
        <AppFeatureMenuItem
          variant={variant}
          href="/app/reservations"
          Icon={Truck}
          text={reservationsFeatureTranslation[locale]}
        />
      )}
      {environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT && (
        <AppFeatureMenuItem
          variant={variant}
          href="/app/material"
          Icon={Package}
          text={materialFeatureTranslation[locale]}
        />
      )}
      <AppFeatureMenuItem
        variant={variant}
        href="/app/settings"
        Icon={Settings}
        text={settingsFeatureTranslation[locale]}
      />
    </>
  );

  if (variant === 'column') {
    return <div className="flex flex-col gap-0.5">{items}</div>;
  }

  return (
    <>
      <div className="py-6">
        <h3 className="text-conveniat-green mb-2 font-bold">{appFeaturesTitle[locale]}</h3>
        {items}
      </div>
      <hr className="border-t-2 text-gray-100" />
    </>
  );
};
