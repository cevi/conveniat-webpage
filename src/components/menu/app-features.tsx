'use client';

import { LinkComponent } from '@/components/ui/link-component';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarCheck2,
  ImageUp,
  LayoutList,
  LucideMessageCircleQuestion,
  Map,
  MessageSquare,
  Settings,
  Siren,
  Truck,
} from 'lucide-react';
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
  de: 'Schichteinsätze von Helfenden',
  fr: 'Services des aides',
};

const departmentShiftsFeatureTranslation: StaticTranslationString = {
  en: 'Department Shifts',
  de: 'Schichteinsätze von Abteilungen',
  fr: 'Services des départements',
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
}

const AppFeatureMenuItem: React.FC<AppFeatureMenuItemProperties> = ({
  href,
  Icon,
  text,
  openInNewTab = false,
}) => {
  return (
    <LinkComponent href={href} openInNewTab={openInNewTab}>
      <span className="closeNavOnClick -mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
        <Icon aria-hidden="true" className="size-5" />
        {text}
      </span>
    </LinkComponent>
  );
};

export const AppFeatures: React.FC<{
  locale: Locale;
}> = ({ locale }) => {
  return (
    <>
      <div className="py-6">
        <h3 className="text-conveniat-green mb-2 font-bold">{appFeaturesTitle[locale]}</h3>

        <AppFeatureMenuItem
          href="/app/chat"
          Icon={MessageSquare}
          text={chatFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/forum"
          Icon={LucideMessageCircleQuestion}
          text={qaForumFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/emergency"
          Icon={Siren}
          text={emergencyInfoFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem href="/app/map" Icon={Map} text={campMapFeatureTranslation[locale]} />
        <AppFeatureMenuItem
          href="/app/schedule"
          Icon={Calendar}
          text={scheduleFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/helper-portal"
          Icon={CalendarCheck2}
          text={helperShiftsFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/helper-portal"
          Icon={LayoutList}
          text={departmentShiftsFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/upload-images"
          Icon={ImageUp}
          text={uploadPicturesFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/reservations"
          Icon={Truck}
          text={reservationsFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/settings"
          Icon={Settings}
          text={settingsFeatureTranslation[locale]}
        />
      </div>
      <hr className="border-t-2 text-gray-100" />
    </>
  );
};
