'use client';

import type { ProcessedMainMenuItem } from '@/components/menu/main-menu';
import { LinkComponent } from '@/components/ui/link-component';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, ChevronRight, Languages, Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useRef, useState } from 'react';

export const DesktopNav: React.FC<{
  locale: Locale;
  menuItems: ProcessedMainMenuItem[];
  actionURL: string;
}> = ({ locale, menuItems, actionURL }) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | undefined>();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const timeoutReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const activeItem = menuItems.find((item) => item.id === openDropdownId);
  const activeSubMenu = activeItem?.subMenu;
  const hasActiveSubMenu = Array.isArray(activeSubMenu) && activeSubMenu.length > 0;

  const handleMouseEnter = (itemId: string): void => {
    if (timeoutReference.current) {
      clearTimeout(timeoutReference.current);
      timeoutReference.current = undefined;
    }
    setOpenDropdownId(itemId);
  };

  const handleMouseLeave = (): void => {
    if (timeoutReference.current) {
      clearTimeout(timeoutReference.current);
    }
    timeoutReference.current = setTimeout(() => {
      setOpenDropdownId(undefined);
    }, 150);
  };

  const handleLanguageChange = (lang: Locale): void => {
    const langRegex = /^\/(de|en|fr)\//;
    let newPath: string;

    const searchParametersString = searchParameters.toString();
    const searchParameterPrefixed =
      searchParametersString === '' ? '' : `?${searchParametersString}`;

    if (langRegex.test(pathname)) {
      newPath = pathname.replace(langRegex, `/${lang}/`) + searchParameterPrefixed;
    } else {
      const path = pathname.replace(/\/(de|en|fr)\/?$/, '');
      const cleanPath = path.startsWith('//') ? path.slice(1) : path;
      const pathWithoutLeadingSlash = cleanPath.replace(/^\//, '');
      newPath = `/${lang}/${pathWithoutLeadingSlash}${searchParameterPrefixed}`;
    }

    if (newPath.endsWith('/') && newPath.length > 1) {
      newPath = newPath.slice(0, -1);
    }

    globalThis.location.href = newPath;
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery !== '') {
      router.push(`/${locale}${actionURL}?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  return (
    <div className="hidden items-center gap-6 xl:flex" onMouseLeave={handleMouseLeave}>
      {/* Main Navigation Bar */}
      <nav className="flex items-center gap-1 xl:gap-2">
        {menuItems.map((item) => {
          if (!item.isVisible) return;

          const hasSubMenu = Array.isArray(item.subMenu) && item.subMenu.length > 0;

          if (!hasSubMenu && typeof item.itemLink === 'string' && item.itemLink !== '') {
            return (
              <LinkComponent
                key={item.id}
                href={item.itemLink}
                openInNewTab={item.openInNewTab}
                prefetch
                onMouseEnter={() => handleMouseEnter('')}
                className="hover:bg-conveniat-green/10 hover:text-conveniat-green rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200"
              >
                {item.label}
              </LinkComponent>
            );
          }

          if (hasSubMenu) {
            const isOpen = openDropdownId === item.id;

            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  onMouseEnter={() => handleMouseEnter(item.id)}
                  onClick={() =>
                    isOpen ? setOpenDropdownId(undefined) : handleMouseEnter(item.id)
                  }
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200',
                    isOpen
                      ? 'bg-conveniat-green/10 text-conveniat-green shadow-xs'
                      : 'hover:bg-conveniat-green/10 hover:text-conveniat-green text-gray-700',
                  )}
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    className={cn(
                      'size-4 text-gray-400 transition-transform duration-200',
                      isOpen && 'text-conveniat-green rotate-180',
                    )}
                  />
                </button>
              </div>
            );
          }

          return (
            <span
              key={item.id}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-400"
            >
              {item.label}
            </span>
          );
        })}
      </nav>

      {/* Modern Sleek Full-Width Submenu Flyout Panel */}
      {hasActiveSubMenu && (
        <div
          className="animate-in fade-in-0 slide-in-from-top-1 fixed top-16 right-0 left-0 z-50 w-full border-b border-gray-200/80 bg-white/98 shadow-xl backdrop-blur-2xl transition-all duration-200"
          onMouseEnter={() => {
            if (typeof openDropdownId === 'string' && openDropdownId !== '') {
              handleMouseEnter(openDropdownId);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-full px-6 py-8 xl:px-12">
            <div className="flex flex-wrap gap-8 xl:gap-12">
              {activeSubMenu.map((subItem) => {
                if (!subItem.isVisible) return;

                const hasSubSub = Array.isArray(subItem.subMenu) && subItem.subMenu.length > 0;

                return (
                  <div key={subItem.id} className="max-w-[280px] min-w-[220px] flex-1">
                    {/* Section Header */}
                    {typeof subItem.itemLink === 'string' && subItem.itemLink !== '' ? (
                      <LinkComponent
                        href={subItem.itemLink}
                        openInNewTab={subItem.openInNewTab}
                        prefetch
                        className="group/head text-conveniat-green hover:text-conveniat-green/80 border-conveniat-green/20 mb-3 flex items-center justify-between border-b pb-2 font-['Montserrat'] text-xs font-extrabold tracking-wider uppercase transition-colors"
                      >
                        <span>{subItem.label}</span>
                        <ChevronRight className="size-3.5 transition-transform duration-150 group-hover/head:translate-x-1" />
                      </LinkComponent>
                    ) : (
                      <div className="text-conveniat-green border-conveniat-green/20 mb-3 border-b pb-2 font-['Montserrat'] text-xs font-extrabold tracking-wider uppercase">
                        {subItem.label}
                      </div>
                    )}

                    {/* Level 3 Links List */}
                    {hasSubSub && (
                      <div className="flex flex-col space-y-1">
                        {subItem.subMenu?.map((subSubItem) => {
                          if (!subSubItem.isVisible) return;

                          if (
                            typeof subSubItem.itemLink === 'string' &&
                            subSubItem.itemLink !== ''
                          ) {
                            return (
                              <LinkComponent
                                key={subSubItem.id}
                                href={subSubItem.itemLink}
                                openInNewTab={subSubItem.openInNewTab}
                                prefetch
                                className="group/item hover:bg-conveniat-green/10 hover:text-conveniat-green flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-150"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="bg-conveniat-green/40 group-hover/item:bg-conveniat-green size-1.5 rounded-full transition-colors" />
                                  <span>{subSubItem.label}</span>
                                </span>
                                <ChevronRight className="text-conveniat-green size-3.5 opacity-0 transition-all duration-150 group-hover/item:translate-x-0.5 group-hover/item:opacity-100" />
                              </LinkComponent>
                            );
                          }

                          return (
                            <span
                              key={subSubItem.id}
                              className="block px-3 py-1.5 text-xs font-medium text-gray-400"
                            >
                              {subSubItem.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Utilities: Language Switcher & Search Bar */}
      <div className="flex items-center gap-3 border-l border-gray-200/80 pl-4">
        {/* Language Switcher */}
        <div
          className="relative"
          onMouseEnter={() => setIsLangOpen(true)}
          onMouseLeave={() => setIsLangOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="hover:border-conveniat-green/40 hover:text-conveniat-green flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-all duration-200 hover:bg-white"
          >
            <Languages className="text-conveniat-green size-3.5" />
            <span className="uppercase">{locale}</span>
            <ChevronDown
              className={cn(
                'size-3 text-gray-400 transition-transform',
                isLangOpen && 'rotate-180',
              )}
            />
          </button>

          {isLangOpen && (
            <div className="absolute top-full right-0 z-50 w-32 pt-2">
              <div className="animate-in fade-in-0 slide-in-from-top-1 rounded-xl border border-gray-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl duration-150">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('de')}
                  className={cn(
                    'block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors',
                    locale === 'de'
                      ? 'bg-conveniat-green/10 text-conveniat-green font-bold'
                      : 'hover:text-conveniat-green text-gray-700 hover:bg-gray-100',
                  )}
                >
                  Deutsch
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('fr')}
                  className={cn(
                    'block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors',
                    locale === 'fr'
                      ? 'bg-conveniat-green/10 text-conveniat-green font-bold'
                      : 'hover:text-conveniat-green text-gray-700 hover:bg-gray-100',
                  )}
                >
                  Français
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={cn(
                    'block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors',
                    locale === 'en'
                      ? 'bg-conveniat-green/10 text-conveniat-green font-bold'
                      : 'hover:text-conveniat-green text-gray-700 hover:bg-gray-100',
                  )}
                >
                  English
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Suchen..."
            className="focus:border-conveniat-green focus:ring-conveniat-green/20 w-32 rounded-xl border border-gray-200 bg-gray-50/80 py-1.5 pr-3 pl-8 text-xs text-gray-800 transition-all duration-300 focus:w-48 focus:bg-white focus:ring-2 focus:outline-hidden"
          />
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-gray-400" />
        </form>
      </div>
    </div>
  );
};
