import { FooterBuildInfoText } from '@/components/footer/footer-copyright-area';
import { LanguageSwitcher } from '@/components/menu/language-switcher';
import { SearchComponent } from '@/components/menu/search';
import { getBuildInfo } from '@/utils/get-build-info';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { Popover, PopoverBackdrop, PopoverButton, PopoverPanel } from '@headlessui/react';
import config from '@payload-config';
import { CircleX, Menu as MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { getPayload } from 'payload';
import React from 'react';

export const NavComponent: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();
  const isInAppDesign = await renderInAppDesign();
  const build = await getBuildInfo();

  const { mainMenu } = await payload.findGlobal({ slug: 'header', locale });
  if (mainMenu === undefined || mainMenu === null) return;

  return (
    <Popover>
      <PopoverButton
        className="relative top-[18px] outline-none"
        aria-label="Open main menu"
        tabIndex={1}
        aria-hidden="true"
      >
        <MenuIcon />
      </PopoverButton>

      <PopoverPanel
        transition
        className="fixed left-0 top-0 z-[120] h-dvh w-svw bg-[#F8FAFF80] p-8"
      >
        <div className="mx-auto h-full w-full max-w-2xl shrink rounded-2xl border-2 border-gray-200 bg-white p-4 text-sm/6 font-semibold text-gray-900 shadow-lg ring-1 ring-gray-900/5">
          <div className="flex justify-end">
            <PopoverBackdrop aria-label="Close main menu">
              <CircleX />
            </PopoverBackdrop>
          </div>
          <nav>
            {mainMenu.map((item) => (
              <Link key={item.id} href={item.link}>
                <PopoverBackdrop className="hover:text-indigo-600 block p-2">
                  {item.label}
                </PopoverBackdrop>
              </Link>
            ))}
          </nav>

          <hr className="my-6" />

          <LanguageSwitcher locale={locale} />
          <SearchComponent locale={locale} />

          {isInAppDesign && build && (
            <>
              <div className="my-2 mb-[16px] flex flex-col text-center">
                <FooterBuildInfoText>Version {build.version} </FooterBuildInfoText>
                <FooterBuildInfoText>
                  Build {build.git.hash} vom {build.timestamp}
                </FooterBuildInfoText>
              </div>
            </>
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
};
