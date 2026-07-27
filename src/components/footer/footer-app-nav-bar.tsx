'use client';

import type { AppNavBarItem } from '@/components/footer/footer-nav-bar-menu-entries';
import { resolveAppNavBarEntries } from '@/components/footer/footer-nav-bar-menu-entries';
import { NavLink } from '@/components/footer/nav-link';
import type { Config } from '@/features/payload-cms/payload-types';
import { usePathname, useRouter } from 'next/navigation';
import React, { useMemo, useState, useTransition } from 'react';

export interface FooterAppNavBarProperties {
  locale: Config['locale'];
  items?: AppNavBarItem[] | undefined;
}

export const FooterAppNavBar: React.FC<FooterAppNavBarProperties> = ({ locale, items }) => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = useMemo(() => {
    if (items && items.length > 0) return items;
    return resolveAppNavBarEntries(undefined, locale);
  }, [items, locale]);

  const longestMatch = useMemo(() => {
    const pathnameWithoutLocale = pathname.replace(/^\/(de|en|fr)\/(.*)/, '/$2');
    return navItems.reduce((accumulator, item) => {
      if (pathnameWithoutLocale.startsWith(item.href) && item.href.length > accumulator.length) {
        return item.href;
      }
      return accumulator;
    }, '');
  }, [navItems, pathname]);

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
    <div className="fixed bottom-0 left-0 z-40 flex h-20 w-dvw border-t-2 border-gray-200 bg-[#f8fafc] xl:left-[480px] xl:w-[calc(100dvw-480px)]">
      <nav className="flex w-full items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = longestMatch === item.href || currentLoadingHref === item.href;

          return (
            <NavLink
              key={`${item.href}-${item.label}`}
              href={item.href}
              icon={item.icon}
              label={item.label}
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
  );
};
