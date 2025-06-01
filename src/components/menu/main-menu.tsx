import { FooterBuildInfoText } from '@/components/footer/footer-copyright-area';
import { MainMenuLanguageSwitcher } from '@/components/menu/main-menu-language-switcher';
import { SearchComponent } from '@/components/menu/search';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import { getBuildInfo } from '@/utils/get-build-info';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import config from '@payload-config';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { getPayload } from 'payload';
import type React from 'react';

export const MainMenu: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();
  const isInAppDesign = await renderInAppDesign();
  const build = await getBuildInfo();

  const actionURL = specialPagesTable['search']?.alternatives[locale] || '/search';

  const { mainMenu } = await payload.findGlobal({ slug: 'header', locale });
  if (mainMenu === undefined || mainMenu === null) return;

  return (
    <div className="mx-auto mt-8 flex h-[calc(100%-100px)] max-w-md flex-col justify-between divide-gray-100">
      <div>
        <span className="text-conveniat-green hidden w-full font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:block">
          <Link key="home" href="/">
            conveniat27
          </Link>
        </span>
        <div className="space-y-2 py-6">
          {mainMenu.map((item) => {
            if (item.subMenu && item.subMenu.length > 0) {
              return (
                <Disclosure key={item.id} as="div" className="-mx-3">
                  <DisclosureButton className="group flex w-full cursor-pointer items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
                    {item.label}
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 flex-none group-data-open:rotate-180"
                    />
                  </DisclosureButton>
                  <DisclosurePanel className="mt-2 space-y-2">
                    {item.subMenu.map((subItem) => (
                      <Link
                        key={subItem.id}
                        href={subItem.link}
                        className="closeNavOnClick block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </DisclosurePanel>
                </Disclosure>
              );
            }

            if (item.link === undefined || item.link === null) return <></>;

            // If the item has no sub-menu, render a simple link
            return (
              <Link key={item.id} href={item.link}>
                <span className="closeNavOnClick -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <hr className="divide-y-2 divide-gray-100 xl:hidden" />

      <div className="divide-y-2 divide-gray-100">
        <MainMenuLanguageSwitcher locale={locale} />

        <SearchComponent locale={locale} actionURL={actionURL} />

        {isInAppDesign && build && (
          <>
            <div className="flex flex-col py-6 text-center">
              <FooterBuildInfoText>Version {build.version} </FooterBuildInfoText>
              <FooterBuildInfoText>
                Build {build.git.hash} vom {build.timestamp}
              </FooterBuildInfoText>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
