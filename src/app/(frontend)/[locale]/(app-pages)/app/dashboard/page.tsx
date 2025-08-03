import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { Button } from '@/components/ui/buttons/button';
import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { getScheduleEntries } from '@/features/schedule/api/get-schedule-entries';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const welcomeParagraph: StaticTranslationString = {
  en: 'Welcome to the conveniat27 App!',
  de: 'Willkommen in der conveniat27 App!',
  fr: "Bienvenue dans l'application conveniat27!",
};

const dashboardTitle: StaticTranslationString = {
  en: 'Dashboard',
  de: 'Dashboard',
  fr: 'Tableau de bord',
};

const upcomingProgramElementsTitle: StaticTranslationString = {
  en: 'Upcoming Program Elements',
  de: 'Bevorstehende Programmelemente',
  fr: 'Éléments de programme à venir',
};

const gettingStartedTitle: StaticTranslationString = {
  en: 'Getting Started',
  de: 'Erste Schritte',
  fr: 'Pour commencer',
};

const gettingStartedParagraph: StaticTranslationString = {
  en: 'To get the most out of the conveniat27 App, we recommend starting with the following steps:',
  de: 'Um das Beste aus der conveniat27 App herauszuholen, empfehlen wir dir, mit den folgenden Schritten zu beginnen:',
  fr: "Pour tirer le meilleur parti de l'application conveniat27, nous vous recommandons de commencer par les étapes suivantes :",
};

const exploreProgramElements: StaticTranslationString = {
  en: 'Explore the upcoming program elements:',
  de: 'Erkunde die bevorstehenden Programmelemente:',
  fr: 'Explorez les éléments de programme à venir :',
};

const viewScheduleLink: StaticTranslationString = {
  en: 'View Schedule',
  de: 'Zeitplan ansehen',
  fr: 'Voir le calendrier',
};

const checkMapDescription: StaticTranslationString = {
  en: 'Check out the',
  de: 'Schau dir die',
  fr: 'Consultez la',
};

const mapLink: StaticTranslationString = {
  en: 'Map',
  de: 'Karte',
  fr: 'carte',
};

const findWayAround: StaticTranslationString = {
  en: 'to find your way around the event locations.',
  de: 'an, um dich an den Veranstaltungsorten zurechtzufinden.',
  fr: "pour vous orienter sur les lieux de l'événement.",
};

const exploreWebsiteTitle: StaticTranslationString = {
  en: 'Explore the Website',
  de: 'Erkunde die Webseite',
  fr: 'Explorer le site web',
};

const exploreWebsiteParagraph: StaticTranslationString = {
  en: 'Did you know that you can explore our full website directly within the app? Click the link below to visit the conveniat27 website and discover more about our events, speakers, and activities.',
  de: 'Wusstest du, dass du unsere vollständige Webseite direkt in der App erkunden kannst? Klicke auf den Link unten, um die conveniat27 Webseite zu besuchen und mehr über unsere Veranstaltungen, Referenten und Aktivitäten zu erfahren.',
  fr: "Saviez-vous que vous pouvez explorer notre site web complet directement dans l'application? Cliquez sur le link ci-dessous pour visiter le site web de conveniat27 und en savoir plus über unsere Veranstaltungen, Referenten und Aktivitäten.",
};

const visitWebsiteButton: StaticTranslationString = {
  en: 'Visit conveniat27 Website',
  de: 'Besuche die conveniat27 Webseite',
  fr: 'Visitez le site web de conveniat27',
};

const Dashboard: React.FC = async () => {
  const locale = await getLocaleFromCookies();
  const scheduleEvents = await getScheduleEntries();
  const upcomingEvents = scheduleEvents.slice(0, 3); // Limit to 3 upcoming events

  return (
    <>
      <SetDynamicPageTitle newTitle={dashboardTitle[locale]} />
      <section className="container mx-auto my-8 px-4 py-8 md:py-12">
        <article className="mx-auto w-full max-w-2xl space-y-10">
          {/* Welcome Section */}
          <div>
            <HeadlineH1>{dashboardTitle[locale]}</HeadlineH1>
            <p className="mt-2 text-gray-700">{welcomeParagraph[locale]}</p>
          </div>

          {/* Upcoming Program Elements */}
          <div>
            <SubheadingH2>{upcomingProgramElementsTitle[locale]}</SubheadingH2>
            <div className="mt-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((entry) => (
                <div key={entry.id} className="flex flex-col rounded-md border p-4 shadow-sm">
                  <div className="mb-2">
                    <h3 className="font-heading text-conveniat-green text-base font-extrabold text-balance">
                      {entry.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(entry.timeslot.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-1">
                    <LexicalRichTextSection richTextSection={entry.description} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Getting Started */}
          <div>
            <SubheadingH2>{gettingStartedTitle[locale]}</SubheadingH2>
            <p className="mt-2 text-gray-700">{gettingStartedParagraph[locale]}</p>
            <ol className="mt-4 space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <ArrowRight className="text-conveniat-green mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>
                  {exploreProgramElements[locale]}{' '}
                  <LinkComponent
                    className="font-bold text-red-600 hover:underline"
                    href="/app/schedule"
                  >
                    {viewScheduleLink[locale]}
                  </LinkComponent>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="text-conveniat-green mt-0.5 h-5 w-5 flex-shrink-0" />
                <span>
                  {checkMapDescription[locale]}{' '}
                  <LinkComponent
                    className="font-bold text-red-600 hover:underline"
                    href="/app/schedule"
                  >
                    {mapLink[locale]}
                  </LinkComponent>{' '}
                  {findWayAround[locale]}
                </span>
              </li>
            </ol>
          </div>

          {/* Explore Website */}
          <div className="rounded-md border p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">{exploreWebsiteTitle[locale]}</h3>
              <p className="mt-2 text-gray-700">{exploreWebsiteParagraph[locale]}</p>
            </div>
            <div>
              <Link href="/" passHref>
                <Button className="bg-conveniat-green hover:bg-conveniat-green-dark text-white">
                  {visitWebsiteButton[locale]}
                </Button>
              </Link>
            </div>
          </div>
        </article>
      </section>
    </>
  );
};

export default Dashboard;
