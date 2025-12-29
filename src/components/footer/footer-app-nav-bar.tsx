'use client';

import { footerNavBarMenuEntries } from '@/components/footer/footer-nav-bar-menu-entries';
import { NavLink } from '@/components/footer/nav-link';
import type { Config } from '@/features/payload-cms/payload-types';
import { usePathname, useRouter } from 'next/navigation';
import React, { useMemo, useState, useTransition } from 'react';

export const FooterAppNavBar: React.FC<{
  locale: Config['locale'];
}> = ({ locale }) => {
  const pathname = usePathname();
  const router = useRouter();

  const longestMatch = useMemo(() => {
    const pathnameWithoutLocale = pathname.replace(/^\/(de|en|fr)\/(.*)/, '/$2');
    return footerNavBarMenuEntries.reduce((accumulator, item) => {
      if (pathnameWithoutLocale.startsWith(item.href) && item.href.length > accumulator.length) {
        return item.href;
      }
      return accumulator;
    }, '');
  }, [pathname]);

  const [isPending, startTransition] = useTransition();
  const [loadingHref, setLoadingHref] = useState<string | undefined>();

  const handleNavClick = (href: string): void => {
    if (href === longestMatch) return;

    setLoadingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const currentLoadingHref = isPending ? loadingHref : undefined;

  return (
    <>
      <div className="fixed bottom-0 left-0 z-40 flex h-20 w-dvw border-t-2 border-gray-200 bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
        <nav className="flex w-full items-center justify-around px-4">
          {footerNavBarMenuEntries.map((item) => {
            const isActive = longestMatch === item.href || currentLoadingHref === item.href;

            return (
              <NavLink
                key={item.label[locale]}
                href={item.href}
                icon={item.icon}
                label={item.label[locale]}
                isActive={isActive}
                color={item.color}
                onClick={handleNavClick}
                isLoading={isPending}
                loadingHref={currentLoadingHref}
              />
            );
          })}
        </nav>
      </div>
    </>
  );
};
