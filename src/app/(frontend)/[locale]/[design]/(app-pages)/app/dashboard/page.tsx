import { DashboardUpcomingEvents } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events';
import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { getScheduleEntries } from '@/features/schedule/api/get-schedule-entries';
import type { Locale, StaticTranslationString } from '@/types/types';
import {
  Calendar,
  Compass,
  ImageUp,
  LucideMessageCircleQuestion,
  MapIcon,
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

const AppFeatures: React.FC<{ locale: Locale }> = ({ locale }) => {
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

const Dashboard: React.FC<{
  params: Promise<{ locale: Locale }>;
}> = async ({ params }) => {
  const { locale } = await params;
  const scheduleEvents = await getScheduleEntries();

  return (
    <>
      <SetDynamicPageTitle newTitle={dashboardTitle[locale]} />
      <section className="container mx-auto mt-8 py-6">
        <article className="mx-auto w-full max-w-2xl space-y-6 px-8">
          {/* App Features Section */}
          <AppFeatures locale={locale} />

          {/* Upcoming Program Elements Section */}
          <DashboardUpcomingEvents locale={locale} scheduleEvents={scheduleEvents} />
        </article>
      </section>
    </>
  );
};

export default Dashboard;
