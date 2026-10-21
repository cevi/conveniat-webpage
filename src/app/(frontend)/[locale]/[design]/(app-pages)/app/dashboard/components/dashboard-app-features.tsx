import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import type { Locale, StaticTranslationString } from '@/types/types';
import {
  Calendar,
  CalendarCheck2,
  ChevronRight,
  Compass,
  ImageUp,
  MapIcon,
  MessageCircle,
  Settings,
  Siren,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

interface FeatureCardProperties {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

/** One row of the feature list: icon tile, name and what it is for. */
const FeatureRow: React.FC<FeatureCardProperties> = ({ title, description, href, icon }) => (
  <li>
    <Link href={href} className="hover:bg-page flex min-h-11 items-center gap-3 px-3.5 py-3">
      <IconTile icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-5 font-semibold text-green-900">{title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[18px] text-green-700">
          {description}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
    </Link>
  </li>
);

const featuresTitle: StaticTranslationString = {
  de: 'Funktionen',
  en: 'Features',
  fr: 'Fonctionnalités',
};

type AppFeatureFlagKey =
  | 'helperShiftsEnabled'
  | 'imageUploadEnabled'
  | 'photoContestEnabled'
  | 'reservationsEnabled'
  | 'forumEnabled';

/**
 * Resolved feature flags: a flag that was never set explicitly counts as enabled.
 */
export type DashboardFeatureFlags = Record<AppFeatureFlagKey, boolean>;

interface FeatureDefinition extends FeatureCardProperties {
  /** When set, this feature is only shown if the corresponding flag is not false. */
  featureFlagKey?: AppFeatureFlagKey;
}

/**
 * The list of the app's features on Home, each a row that leads to it. Features behind a
 * flag are left out when the flag is off.
 */
export const DashboardAppFeatures: React.FC<{
  locale: Locale;
  featureFlags: DashboardFeatureFlags;
}> = ({ locale, featureFlags }) => {
  const features: FeatureDefinition[] = [
    {
      title: { en: 'Chat', de: 'Chat', fr: 'Chat' }[locale],
      description: {
        en: 'Connect and communicate with other participants',
        de: 'Verbinde dich und kommuniziere mit anderen Teilnehmern',
        fr: "Connectez-vous et communiquez avec d'autres participants",
      }[locale],
      href: '/app/chat',
      icon: MessageCircle,
    },
    {
      title: { en: 'Emergency', de: 'Notfall', fr: 'Urgence' }[locale],
      description: {
        en: 'Quick access to emergency contacts and information',
        de: 'Schneller Zugang zu Notfallkontakten und Informationen',
        fr: "Accès rapide aux contacts et informations d'urgence",
      }[locale],
      href: '/app/emergency',
      icon: Siren,
    },
    {
      title: { en: 'Map', de: 'Karte', fr: 'Carte' }[locale],
      description: {
        en: 'Navigate through event locations and find your way',
        de: 'Navigiere durch Veranstaltungsorte und finde deinen Weg',
        fr: "Naviguez dans les lieux d'événements et trouvez votre chemin",
      }[locale],
      href: '/app/map',
      icon: MapIcon,
    },
    {
      title: { en: 'Schedule', de: 'Programm', fr: 'Programme' }[locale],
      description: {
        en: 'View upcoming events and program elements',
        de: 'Zeige bevorstehende Veranstaltungen und Programmelemente an',
        fr: 'Voir les événements à venir et les éléments du programme',
      }[locale],
      href: '/app/schedule',
      icon: Calendar,
    },
    {
      title: { en: 'Helper Shifts', de: 'Schichteinsätze', fr: 'Services de helpers' }[locale],
      description: {
        en: 'View and manage your helper shifts',
        de: 'Sehe und verwalte deine Schichteinsätze',
        fr: 'Voir et gérer vos services de helpers',
      }[locale],
      href: '/app/helper-portal',
      icon: CalendarCheck2,
      featureFlagKey: 'helperShiftsEnabled',
    },
    {
      title: { en: 'Upload Images', de: 'Bilder hochladen', fr: 'Télécharger des images' }[locale],
      description: {
        en: 'Share your memories by uploading photos',
        de: 'Teile deine Erinnerungen durch das Hochladen von Fotos',
        fr: 'Partagez vos souvenirs en téléchargeant des photos',
      }[locale],
      href: '/app/upload-images',
      icon: ImageUp,
      featureFlagKey: 'imageUploadEnabled',
    },
    {
      title: { en: 'Photo Contest', de: 'Foto-Wettbewerb', fr: 'Concours photo' }[locale],
      description: {
        en: 'Vote for your favorite photos and submit live event pictures',
        de: 'Stimme für deine Lieblingsfotos ab und lade Live-Event-Fotos hoch',
        fr: 'Votez pour vos photos préférées et envoyez vos photos en direct',
      }[locale],
      href: '/app/photo-contest',
      icon: Trophy,
      featureFlagKey: 'photoContestEnabled',
    },
    {
      title: { en: 'Settings', de: 'Einstellungen', fr: 'Paramètres' }[locale],
      description: {
        en: 'Customize your app experience and preferences',
        de: 'Passe deine App-Erfahrung und Einstellungen an',
        fr: "Personnalisez votre expérience et vos préférences d'application",
      }[locale],
      href: '/app/settings',
      icon: Settings,
    },
    {
      title: { en: 'Explore Webpage', de: 'Webseite entdecken', fr: 'Explorer la page web' }[
        locale
      ],
      description: {
        en: 'Visit the official event webpage for more information',
        de: 'Besuche die offizielle Veranstaltungs-Webseite für mehr Informationen',
        fr: "Visitez la page web officielle de l'événement pour plus d'informations",
      }[locale],
      href: '/',
      icon: Compass,
    },
  ];

  const visibleFeatures = features.filter((feature) => {
    if (feature.featureFlagKey === undefined) return true;
    return featureFlags[feature.featureFlagKey];
  });

  return (
    <section className="space-y-2">
      <SectionLabel>{featuresTitle[locale]}</SectionLabel>
      <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
        {visibleFeatures.map((feature) => (
          <FeatureRow key={feature.href} {...feature} />
        ))}
      </ul>
    </section>
  );
};
