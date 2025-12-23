import { FooterBuildInfoText } from '@/components/footer/footer-copyright-area';
import { MainMenuLanguageSwitcher } from '@/components/menu/main-menu-language-switcher';
import { SearchComponent } from '@/components/menu/search';
import { LinkComponent } from '@/components/ui/link-component';
import {
  getURLForLinkField,
  hasPermissionsForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Header } from '@/features/payload-cms/payload-types';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import type { Locale } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import { cn } from '@/utils/tailwindcss-override';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import config from '@payload-config';
import { ChevronDown, OctagonAlert } from 'lucide-react';
import { cacheLife, cacheTag } from 'next/cache';
import { draftMode } from 'next/headers';
import { getPayload } from 'payload';
import type React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { AppFeatures } from '@/components/menu/app-features';
const DeletedMenuEntry: React.FC<{ message: string }> = ({ message }) => {
  return (
    <>
      <div className="closeNavOnClick block cursor-pointer items-center gap-2 rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-500 hover:bg-gray-50">
        {message} <OctagonAlert color="red" />
      </div>
    </>
  );
};

const getMainMenuFromPayloadCached = async (
  locale: Locale,
  showPreviewForMainMenu: boolean,
): Promise<Header['mainMenu']> => {
  'use cache';
  cacheLife('hours');
  cacheTag('header');

  const payload = await getPayload({ config });
  const { mainMenu } = await payload.findGlobal({
    slug: 'header',
    locale,
    draft: showPreviewForMainMenu,
  });

  return Array.isArray(mainMenu) ? mainMenu : [];
};

export const MainMenu: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = async ({ locale, inAppDesign }) => {
  const build = await getBuildInfo(locale);
  const actionURL = specialPagesTable['search']?.alternatives[locale] ?? '/suche';

  // if the user is logged in, we show the preview for the menu
  const draft = await draftMode();
  const showPreviewForMainMenu: boolean = draft.isEnabled;
  const mainMenu = await getMainMenuFromPayloadCached(locale, showPreviewForMainMenu);

  // fallback to an empty array if mainMenu is not an array, to avoid runtime errors
  const mainMenuWithFallback = Array.isArray(mainMenu) ? mainMenu : [];

  return (
    <div
      className={cn(
        'mx-auto mt-8 flex h-[calc(100%-100px)] max-w-md flex-col justify-between divide-gray-100 overflow-x-hidden overflow-y-auto px-4 xl:px-8',
        { 'pb-16': inAppDesign },
      )}
    >
      <div>
        <span className="text-conveniat-green hidden w-full font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:block">
          <LinkComponent key="home" href="/">
            conveniat27
          </LinkComponent>
        </span>

        {inAppDesign && <AppFeatures locale={locale} />}

        <div className="py-6">
          {inAppDesign && <h3 className="text-conveniat-green mb-2 font-bold">Web Inhalte</h3>}
          {showPreviewForMainMenu && (
            <div className="closeNavOnClick block cursor-pointer rounded-lg bg-orange-500 py-2 pr-3 pl-6 text-sm/7 font-semibold text-white">
              Preview Menu
            </div>
          )}
          {mainMenuWithFallback.map(async (item) => {
            if (item.subMenu && item.subMenu.length > 0) {
              const subMenuItemsWherePermitted = await Promise.all(
                item.subMenu.map(async (subItem) => {
                  const hasPermission = await hasPermissionsForLinkField(subItem.linkField);
                  return { hasPerm: hasPermission, item: subItem };
                }),
              );

              const allNull = subMenuItemsWherePermitted.every(
                (subItem) => subItem.hasPerm === false,
              );

              if (allNull) {
                return <></>;
              }

              return (
                <ErrorBoundary fallback={<></>} key={item.id}>
                  <Disclosure as="div" className="-mx-3">
                    <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
                      {item.label}
                      <ChevronDown
                        aria-hidden="true"
                        className="size-5 flex-none group-data-open:rotate-180"
                      />
                    </DisclosureButton>
                    <DisclosurePanel className="mt-2 mb-4 space-y-2">
                      {subMenuItemsWherePermitted.map((subItem) =>
                        subItem.hasPerm ? (
                          <LinkComponent
                            key={subItem.item.id}
                            href={getURLForLinkField(subItem.item.linkField, locale) ?? '/'}
                            openInNewTab={openURLInNewTab(subItem.item.linkField)}
                            className="closeNavOnClick block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
                          >
                            {subItem.item.label}
                          </LinkComponent>
                        ) : (
                          showPreviewForMainMenu && (
                            <DeletedMenuEntry key={subItem.item.id} message={subItem.item.label} />
                          )
                        ),
                      )}
                    </DisclosurePanel>
                  </Disclosure>
                </ErrorBoundary>
              );
            }

            const itemLink = getURLForLinkField(item.linkField, locale) ?? '/';

            const hasPermission = await hasPermissionsForLinkField(item.linkField);

            if (!hasPermission) {
              return showPreviewForMainMenu && <DeletedMenuEntry message={item.label} />;
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

        {inAppDesign && build && (
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
