import React from 'react';
import { Popover, PopoverBackdrop, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CircleX, Menu as MenuIcon } from 'lucide-react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/menu/language-switcher';

export const NavComponent: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();

  const { mainMenu } = await payload.findGlobal({ slug: 'header', locale });
  if (mainMenu === undefined || mainMenu === null) return;

  return (
    <Popover>
      <PopoverButton className="relative top-[18px] outline-none">
        <MenuIcon aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel
        transition
        className="fixed left-0 top-0 z-[120] h-dvh w-svw bg-[#a4aca7cc] p-8"
      >
        <div className="h-full w-full shrink rounded-2xl border-2 border-gray-200 bg-white p-4 text-sm/6 font-semibold text-gray-900 shadow-lg ring-1 ring-gray-900/5">
          <div className="flex justify-end">
            <PopoverBackdrop>
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

          <LanguageSwitcher />
        </div>
      </PopoverPanel>
    </Popover>
  );
};
