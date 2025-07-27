import { FooterBuildInfoText } from '@/components/footer/footer-copyright-area';
import { MainMenuLanguageSwitcher } from '@/components/menu/main-menu-language-switcher';
import { SearchComponent } from '@/components/menu/search';
import { LinkComponent } from '@/components/ui/link-component';
import {
  getURLForLinkField,
  hasPermissionsForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import type { StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { cn } from '@/utils/tailwindcss-override';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import config from '@payload-config';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CalendarCheck2,
  ChevronDown,
  ImageUp,
  LayoutList,
  LucideMessageCircleQuestion,
  Map,
  MessageSquare,
  Siren,
  Truck,
} from 'lucide-react';
import { getPayload } from 'payload';
import type React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const appFeaturesTitle: StaticTranslationString = {
  en: 'App Features',
  de: 'App Funktionen',
  fr: "Fonctions de l'application",
};

// Define each feature's translation as a separate StaticTranslationString constant
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
  en: 'Alerts and Emergency Information',
  de: 'Alarmierung und Notfallinformationen',
  fr: "Alertes et informations d'urgence",
};

const campMapFeatureTranslation: StaticTranslationString = {
  en: 'Campsite Map',
  de: 'Lagerplatz Karte',
  fr: 'Carte du terrain de camp',
};

const campProgramFeatureTranslation: StaticTranslationString = {
  en: 'Camp Program and Events',
  de: 'Lager-Programm und Veranstaltungen',
  fr: 'Programme du camp et événements',
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

const vehiclesReservationsFeatureTranslation: StaticTranslationString = {
  en: 'Vehicles and Reservations',
  de: 'Fahrzeuge und Reservationen',
  fr: 'Véhicules et réservations',
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

const AppFeatures: React.FC = async () => {
  const locale = await getLocaleFromCookies();

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
          text={campProgramFeatureTranslation[locale]}
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
          href="/app/upload-picture"
          Icon={ImageUp}
          text={uploadPicturesFeatureTranslation[locale]}
        />
        <AppFeatureMenuItem
          href="/app/reservations"
          Icon={Truck}
          text={vehiclesReservationsFeatureTranslation[locale]}
        />
      </div>
      <hr className="border-t-2 text-gray-100" />
    </>
  );
};

export const MainMenu: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();
  const isInAppDesign = await renderInAppDesign();
  const build = await getBuildInfo();

  const actionURL = specialPagesTable['search']?.alternatives[locale] ?? '/search';

  const { mainMenu } = await payload.findGlobal({ slug: 'header', locale });
  if (mainMenu === undefined || mainMenu === null) return;

  return (
    <div
      className={cn(
        'mx-auto mt-8 flex h-[calc(100%-100px)] max-w-md flex-col justify-between divide-gray-100 overflow-x-hidden overflow-y-auto px-4 xl:px-8',
        { 'pb-16': isInAppDesign },
      )}
    >
      <div>
        <span className="text-conveniat-green hidden w-full font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:block">
          <LinkComponent key="home" href="/">
            conveniat27
          </LinkComponent>
        </span>

        {isInAppDesign && <AppFeatures />}

        <div className="py-6">
          {isInAppDesign && <h3 className="text-conveniat-green mb-2 font-bold">Web Inhalte</h3>}

          {mainMenu.map(async (item) => {
            if (item.subMenu && item.subMenu.length > 0) {
              const subMenuItemsWherePermitted = await Promise.all(
                item.subMenu.map(async (subItem) => {
                  const hasPermission = await hasPermissionsForLinkField(subItem.linkField);
                  return hasPermission ? subItem : undefined;
                }),
              );

              const allNull = subMenuItemsWherePermitted.every((subItem) => subItem === undefined);

              if (allNull) {
                return <></>;
              }

              return (
                <ErrorBoundary fallback={<></>}>
                  <Disclosure key={item.id} as="div" className="-mx-3">
                    <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
                      {item.label}
                      <ChevronDown
                        aria-hidden="true"
                        className="size-5 flex-none group-data-open:rotate-180"
                      />
                    </DisclosureButton>
                    <DisclosurePanel className="mt-2 mb-4 space-y-2">
                      {subMenuItemsWherePermitted.map(
                        (subItem) =>
                          subItem && (
                            <LinkComponent
                              key={subItem.id}
                              href={getURLForLinkField(subItem.linkField) ?? '/'}
                              openInNewTab={openURLInNewTab(subItem.linkField)}
                              className="closeNavOnClick block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
                            >
                              {subItem.label}
                            </LinkComponent>
                          ),
                      )}
                    </DisclosurePanel>
                  </Disclosure>
                </ErrorBoundary>
              );
            }

            const itemLink = getURLForLinkField(item.linkField) ?? '/';
            const hasPermission = await hasPermissionsForLinkField(item.linkField);

            if (!hasPermission) {
              return <></>;
            }

            return (
              <LinkComponent
                key={item.id}
                href={itemLink}
                openInNewTab={openURLInNewTab(item.linkField)}
              >
                <span className="closeNavOnClick -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
                  {item.label}
                </span>
              </LinkComponent>
            );
          })}
        </div>
      </div>

      <hr className="border-t-2 bg-gray-100 xl:hidden" />

      <div className="divide-y-2 divide-gray-100 pb-4">
        <MainMenuLanguageSwitcher locale={locale} />
        <SearchComponent locale={locale} actionURL={actionURL} />

        {isInAppDesign && build && (
          <div className="flex flex-col py-6 text-center">
            <FooterBuildInfoText>Version {build.version} </FooterBuildInfoText>
            <FooterBuildInfoText>
              Build {build.git.hash} vom {build.timestamp}
            </FooterBuildInfoText>
          </div>
        )}
      </div>
    </div>
  );
};
