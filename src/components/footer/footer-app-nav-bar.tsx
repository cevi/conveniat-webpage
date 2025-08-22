'use client';

import { footerNavBarMenuEntries } from '@/components/footer/footer-nav-bar-menu-entries';
import { NavLink } from '@/components/footer/nav-link';
import type { Config } from '@/features/payload-cms/payload-types';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export const FooterAppNavBar: React.FC<{
  locale: Config['locale'];
}> = ({ locale }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [longestMatch, setLongestMatch] = React.useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHref, setLoadingHref] = useState<string | undefined>();

  useEffect(() => {
    const pathnameWithoutLocale = pathname.replace(/^\/(de|en|fr)\/(.*)/, '/$2');
    const _longestMatch = footerNavBarMenuEntries.reduce((accumulator, item) => {
      if (pathnameWithoutLocale.startsWith(item.href) && item.href.length > accumulator.length) {
        return item.href;
      }
      return accumulator;
    }, '');
    setLongestMatch(_longestMatch);

    setIsLoading(false);
    setLoadingHref(undefined);
  }, [pathname]);

  const handleNavClick = (href: string): void => {
    if (href === longestMatch) return;

    setIsLoading(true);
    setLongestMatch('');
    setLoadingHref(href);
    router.push(href);
  };

  return (
    <>
      <div className="fixed bottom-0 z-40 flex h-20 w-full border-t-2 border-gray-200 bg-[#f8fafc] xl:w-[calc(100%-480px)]">
        <nav className="flex w-full items-center justify-around px-4">
          {footerNavBarMenuEntries.map((item) => {
            const isActive = longestMatch === item.href || (isLoading && loadingHref === item.href);

            return (
              <NavLink
                key={item.label[locale]}
                href={item.href}
                icon={item.icon}
                label={item.label[locale]}
                isActive={isActive}
                color={item.color}
                onClick={handleNavClick}
                isLoading={isLoading}
                loadingHref={loadingHref}
              />
            );
          })}
        </nav>
      </div>
    </>
  );
};
