import { MenuLink } from '@/components/menu/menu-link';
import { menuRowClassName } from '@/components/menu/menu-row-class-name';
import { SectionLabel } from '@/components/ui/section-label';
import { environmentVariables } from '@/config/environment-variables';
import { getAppFeatureFlagsCached } from '@/features/payload-cms/api/cached-globals';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarCheck2,
  ImageUp,
  Map,
  MessageSquare,
  Package,
  Settings,
  Siren,
  Trophy,
} from 'lucide-react';
import { io } from 'next/cache';
import type React from 'react';

const appFeaturesTitle: StaticTranslationString = {
  en: 'App Features',
  de: 'App Funktionen',
  fr: "Fonctions de l'application",
};

const chatFeatureTranslation: StaticTranslationString = {
  en: 'Chat',
  de: 'Chat',
  fr: 'Chat',
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

interface AppFeatureMenuItemProperties {
  href: string;
  Icon: LucideIcon;
  text: string;
  openInNewTab?: boolean;
  prefetch?: boolean;
}

const AppFeatureMenuItem: React.FC<AppFeatureMenuItemProperties> = ({
  href,
  Icon,
  text,
  openInNewTab = false,
  prefetch,
}) => {
  return (
    <li>
      <MenuLink
        href={href}
        openInNewTab={openInNewTab}
        {...(prefetch === undefined ? {} : { prefetch })}
        matchNested
        className={menuRowClassName}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0 text-green-700" />
        {text}
      </MenuLink>
    </li>
  );
};

export const AppFeatures: React.FC<{
  locale: Locale;
}> = async ({ locale }) => {
  // `io()`, not `connection()`: both stop the build-time prerender before the DB read,
  // but `connection()` never resolves for a prefetch. This subtree holds the app feature
  // <Link>s, so a `connection()` here made every one of them permanently unprefetchable
  // and drove an endless runtime-prefetch retry loop.
  await io();
  const featureFlags = await getAppFeatureFlagsCached();

  return (
    <section className="py-4">
      <SectionLabel className="mb-1 px-3">{appFeaturesTitle[locale]}</SectionLabel>
      <ul>
        <AppFeatureMenuItem
          href="/app/chat"
          Icon={MessageSquare}
          text={chatFeatureTranslation[locale]}
          prefetch
        />
        <AppFeatureMenuItem
          href="/app/emergency"
          Icon={Siren}
          text={emergencyInfoFeatureTranslation[locale]}
          prefetch
        />
        <AppFeatureMenuItem
          href="/app/map"
          Icon={Map}
          text={campMapFeatureTranslation[locale]}
          prefetch
        />
        <AppFeatureMenuItem
          href="/app/schedule"
          Icon={Calendar}
          text={scheduleFeatureTranslation[locale]}
          prefetch
        />
        {featureFlags.helperShiftsEnabled !== false && (
          <AppFeatureMenuItem
            href="/app/helper-portal"
            Icon={CalendarCheck2}
            text={helperShiftsFeatureTranslation[locale]}
          />
        )}
        {featureFlags.imageUploadEnabled !== false && (
          <AppFeatureMenuItem
            href="/app/upload-images"
            Icon={ImageUp}
            text={uploadPicturesFeatureTranslation[locale]}
          />
        )}
        {featureFlags.photoContestEnabled !== false && (
          <AppFeatureMenuItem
            href="/app/photo-contest"
            Icon={Trophy}
            text={photoContestFeatureTranslation[locale]}
          />
        )}
        {environmentVariables.FEATURE_ENABLE_MATERIAL_MANAGEMENT && (
          <AppFeatureMenuItem
            href="/app/material"
            Icon={Package}
            text={materialFeatureTranslation[locale]}
          />
        )}
        <AppFeatureMenuItem
          href="/app/settings"
          Icon={Settings}
          text={settingsFeatureTranslation[locale]}
        />
      </ul>
    </section>
  );
};
