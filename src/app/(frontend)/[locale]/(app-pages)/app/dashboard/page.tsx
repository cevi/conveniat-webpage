import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import { getScheduleEntries } from '@/features/schedule/api/get-schedule-entries';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import type { StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import {
  Calendar,
  Clock,
  Compass,
  ImageUp,
  LucideMessageCircleQuestion,
  MapIcon,
  MapPin,
  MessageCircle,
  Settings,
  Siren,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const dashboardTitle: StaticTranslationString = {
  en: 'Dashboard',
  de: 'Dashboard',
  fr: 'Tableau de bord',
};

const appFeaturesTitle: StaticTranslationString = {
  en: 'conveniat27 App',
  de: 'conveniat27 App',
  fr: 'App conveniat27',
};

const upcomingProgramElementsTitle: StaticTranslationString = {
  en: 'Upcoming Program Elements',
  de: 'Nächsten Programmpunkte',
  fr: 'Éléments de programme à venir',
};

interface FeatureCardProperties {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const FeatureCard: React.FC<FeatureCardProperties> = ({
  title,
  description,
  href,
  icon: IconComponent,
}) => (
  <Link href={href} className="block">
    <div className="bg-conveniat-green/10 border-conveniat-green/20 hover:bg-conveniat-green/15 h-28 w-72 rounded-lg border p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex h-full items-center gap-3">
        <div className="flex w-16 flex-shrink-0 justify-center">
          <div className="bg-conveniat-green/20 rounded-full p-2">
            <IconComponent className="text-conveniat-green h-6 w-6" />
          </div>
        </div>
        <div className="w-2/3 flex-1">
          <h3 className="mb-1 text-base font-semibold text-gray-900">{title}</h3>
          <p className="line-clamp-3 text-xs leading-tight text-balance text-gray-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  </Link>
);

const AppFeatures: React.FC<{ locale: 'en' | 'de' | 'fr' }> = ({ locale }) => {
  const features = [
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
      title: { en: 'Location Map', de: 'Lagerplatz Map', fr: 'Carte des lieux' }[locale],
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
      title: { en: 'Upload Images', de: 'Bilder hochladen', fr: 'Télécharger des images' }[locale],
      description: {
        en: 'Share your memories by uploading photos',
        de: 'Teile deine Erinnerungen durch das Hochladen von Fotos',
        fr: 'Partagez vos souvenirs en téléchargeant des photos',
      }[locale],
      href: '/app/upload-images',
      icon: ImageUp,
    },
    {
      title: { en: 'conveniat27 Forum', de: 'conveniat27 Forum', fr: 'Forum conveniat27' }[locale],
      description: {
        en: 'Discuss topics and share ideas with the community',
        de: 'Diskutiere Themen und teile Ideen mit der Community',
        fr: 'Discutez de sujets et partagez des idées avec la communauté',
      }[locale],
      href: '/app/forum',
      icon: LucideMessageCircleQuestion,
    },
    {
      title: {
        en: 'Reservations',
        de: 'Reservationen',
        fr: 'Réservations',
      }[locale],
      description: {
        en: 'Reserve a vehicle for your needs during the event',
        de: 'Reserviere ein Fahrzeug für deine Bedürfnisse während der Veranstaltung',
        fr: "Réservez un véhicule pour vos besoins pendant l'événement",
      }[locale],
      href: '/app/reservations',
      icon: Truck,
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

  return (
    <div>
      <HeadlineH1 className="mb-4">{appFeaturesTitle[locale]}</HeadlineH1>
      <div className="overflow-x-auto pb-4">
        <div className="flex w-max gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
};

const EventCard: React.FC<{
  entry: CampScheduleEntryFrontendType;
}> = ({ entry }) => {
  const location = entry.location;
  const { formattedDate, time } = formatScheduleDateTime(entry.timeslot.date, entry.timeslot.time);

  return (
    <Link
      href={`/app/schedule/${entry.id}`}
      className="block rounded-md border-2 border-gray-200 bg-white p-4 transition duration-200 hover:shadow-md"
    >
      <div className="space-y-2">
        <h3 className="text-conveniat-green text-sm font-semibold">{entry.title}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <div className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
            <Calendar className="h-3 w-3" />
            <span className="font-medium">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="text-gray-700">{time}</span>
          </div>
          {typeof location === 'object' && location.title !== '' && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-500" />
              <span className="text-xs text-blue-600">{location.title}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const moreEventsTitle: StaticTranslationString = {
  en: 'View More Events',
  de: 'Weitere Veranstaltungen',
  fr: "Voir plus d'événements",
};

const MoreEventsCard: React.FC = async () => {
  const locale = await getLocaleFromCookies();
  return (
    <Link href="/app/schedule" className="block p-2 text-center">
      <div className="text-sm font-semibold text-gray-700">{moreEventsTitle[locale]}</div>
    </Link>
  );
};

const UpcomingEvents: React.FC<{ locale: 'en' | 'de' | 'fr' }> = async ({ locale }) => {
  const scheduleEvents = await getScheduleEntries();
  const upcomingEvents = scheduleEvents.slice(0, 3);

  if (upcomingEvents.length === 0) {
    return <></>;
  }

  return (
    <div>
      <SubheadingH2 className="mt-12 mb-4 text-center">
        {upcomingProgramElementsTitle[locale]}
      </SubheadingH2>
      <div className="space-y-3">
        {upcomingEvents.map((entry) => (
          <EventCard key={entry.id} entry={entry} />
        ))}
        <MoreEventsCard />
      </div>
    </div>
  );
};

const Dashboard: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return (
    <>
      <SetDynamicPageTitle newTitle={dashboardTitle[locale]} />
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-8">
          {/* App Features Section */}
          <AppFeatures locale={locale} />

          {/* Upcoming Program Elements Section */}
          <UpcomingEvents locale={locale} />
        </article>
      </section>
    </>
  );
};

export default Dashboard;
