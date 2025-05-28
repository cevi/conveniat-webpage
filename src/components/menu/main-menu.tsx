import { FooterBuildInfoText } from '@/components/footer/footer-copyright-area';
import { LanguageSwitcher } from '@/components/menu/language-switcher';
import { SearchComponent } from '@/components/menu/search';
import { getBuildInfo } from '@/utils/get-build-info';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { DialogBackdrop, Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import config from '@payload-config';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { getPayload } from 'payload';
import type React from 'react';

const products = [
  {
    name: 'Analytics',
    description: 'Get a better understanding of your traffic',
    href: '#',
  },
  {
    name: 'Engagement',
    description: 'Speak directly to your customers',
    href: '#',
  },
  {
    name: 'Security',
    description: 'Your customers’ data will be safe and secure',
    href: '#',
  },
  {
    name: 'Integrations',
    description: 'Connect with third-party tools',
    href: '#',
  },
  {
    name: 'Automations',
    description: 'Build strategic funnels that will convert',
    href: '#',
  },
];

export const MainMenu: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();
  const isInAppDesign = await renderInAppDesign();
  const build = await getBuildInfo();

  const { mainMenu } = await payload.findGlobal({ slug: 'header', locale });
  if (mainMenu === undefined || mainMenu === null) return;

  return (
    <div className="mt-8 flow-root mx-auto max-w-md">
      <div className="-my-6 divide-y-2 divide-gray-100">
        <SearchComponent locale={locale} />

        <div className="space-y-2 py-6">
          {mainMenu.map((item) => (
            <Link key={item.id} href={item.link}>
              <DialogBackdrop
                as="span"
                className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-700 hover:bg-gray-50"
              >
                {item.label}
              </DialogBackdrop>
            </Link>
          ))}

          <Disclosure as="div" className="-mx-3">
            <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-gray-700 hover:bg-gray-50">
              Product
              <ChevronDown
                aria-hidden="true"
                className="size-5 flex-none group-data-open:rotate-180"
              />
            </DisclosureButton>
            <DisclosurePanel className="mt-2 space-y-2">
              {[...products, ...callsToAction].map((item) => (
                <DisclosureButton
                  key={item.name}
                  as="a"
                  href={item.href}
                  className="block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-gray-500 hover:bg-gray-50"
                >
                  {item.name}
                </DisclosureButton>
              ))}
            </DisclosurePanel>
          </Disclosure>
        </div>
        <LanguageSwitcher locale={locale} />

        {isInAppDesign && build && (
          <>
            <div className="py-6 flex flex-col text-center ">
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
