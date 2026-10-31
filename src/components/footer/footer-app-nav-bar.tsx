'use client';

import type { AppNavBarItem } from '@/components/footer/footer-nav-bar-menu-entries';
import {
  APP_NAV_BAR_ICONS,
  resolveAppNavBarEntries,
} from '@/components/footer/footer-nav-bar-menu-entries';
import { NavLink } from '@/components/footer/nav-link';
import type { Config } from '@/features/payload-cms/payload-types';
import { cn } from '@/utils/tailwindcss-override';
import { House } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useMemo, useState, useTransition } from 'react';

export interface FooterAppNavBarProperties {
  locale: Config['locale'];
  items?: AppNavBarItem[] | undefined;
  /** on a desktop, a rail down the left edge instead of a bar along the bottom */
  railOnDesktop?: boolean;
}

export const FooterAppNavBar: React.FC<FooterAppNavBarProperties> = ({
  locale,
  items,
  railOnDesktop = false,
}) => {
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
    <div
      className={cn(
        'fixed bottom-0 left-(--app-content-left) z-40 flex h-20 w-[calc(100dvw-var(--app-content-left))] border-t-2 border-gray-200 bg-[#f8fafc]',
        // the rail is the free area's left margin, see --app-content-left in the app shell
        railOnDesktop &&
          'xl:top-(--app-content-top) xl:left-0 xl:h-auto xl:w-(--app-content-left) xl:border-t-0 xl:border-r-2',
      )}
    >
      <nav
        className={cn(
          'flex w-full items-center justify-around px-4',
          railOnDesktop && 'xl:flex-col xl:justify-start xl:gap-2 xl:px-0 xl:py-4',
        )}
      >
        {navItems.map((item) => {
          const isActive = longestMatch === item.href || currentLoadingHref === item.href;
          const IconComponent = APP_NAV_BAR_ICONS[item.iconName] ?? House;

          return (
            <NavLink
              key={`${item.href}-${item.label}`}
              href={item.href}
              icon={IconComponent}
              label={item.label}
              isActive={isActive}
              isCurrent={longestMatch === item.href}
              color={item.color}
              onClick={handleNavClick}
              isLoading={isPending}
              loadingHref={currentLoadingHref}
              className={cn(railOnDesktop && 'xl:h-auto xl:w-full xl:flex-none')}
            />
          );
        })}
      </nav>
    </div>
  );
};
