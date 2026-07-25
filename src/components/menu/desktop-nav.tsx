'use client';

import type { ProcessedMainMenuItem } from '@/components/menu/main-menu';
import { LinkComponent } from '@/components/ui/link-component';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, Languages, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useRef, useState } from 'react';

const SubItemWithoutChildren: React.FC<{ subItem: ProcessedMainMenuItem }> = ({ subItem }) => {
  if (typeof subItem.itemLink === 'string' && subItem.itemLink !== '') {
    return (
      <LinkComponent
        href={subItem.itemLink}
        openInNewTab={subItem.openInNewTab}
        prefetch
        className="group/item hover:bg-conveniat-green/10 hover:text-conveniat-green flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-150"
      >
        <span className="flex items-center gap-2">
          <span className="bg-conveniat-green/40 group-hover/item:bg-conveniat-green size-1.5 rounded-full transition-colors" />
          <span>{subItem.label}</span>
        </span>
      </LinkComponent>
    );
  }

  return <span className="block px-3 py-2 text-sm font-medium text-gray-400">{subItem.label}</span>;
};

export const DesktopNav: React.FC<{
  locale: Locale;
  menuItems: ProcessedMainMenuItem[];
  actionURL: string;
}> = ({ locale, menuItems, actionURL }) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | undefined>();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navContainerReference = useRef<HTMLDivElement>(null);
  const flyoutReference = useRef<HTMLDivElement>(null);
  const closeTimeoutReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const openIntentTimeoutReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchInputReference = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const activeItem = menuItems.find((item) => item.id === openDropdownId);
  const activeSubMenu = activeItem?.subMenu;
  const hasActiveSubMenu = Array.isArray(activeSubMenu) && activeSubMenu.length > 0;

  /**
   * Hover Intent Handler
   * Prevents accidental menu switching when cursor moves diagonally from header to megamenu popover.
   */
  const handleMouseEnter = (itemId: string): void => {
    if (closeTimeoutReference.current) {
      clearTimeout(closeTimeoutReference.current);
      closeTimeoutReference.current = undefined;
    }

    if (
      typeof openDropdownId === 'string' &&
      openDropdownId !== '' &&
      openDropdownId !== itemId &&
      itemId !== ''
    ) {
      if (openIntentTimeoutReference.current) {
        clearTimeout(openIntentTimeoutReference.current);
      }
      openIntentTimeoutReference.current = setTimeout(() => {
        setOpenDropdownId(itemId);
      }, 120);
    } else {
      if (openIntentTimeoutReference.current) {
        clearTimeout(openIntentTimeoutReference.current);
        openIntentTimeoutReference.current = undefined;
      }
      setOpenDropdownId(itemId);
    }
  };

  /**
   * Safe Mouse Leave Handler
   * Verifies that the cursor has genuinely left both the header navigation area and the megamenu flyout panel before closing.
   */
  const handleMouseLeave = (event?: React.MouseEvent): void => {
    if (event?.relatedTarget instanceof Node) {
      const target = event.relatedTarget;
      if (
        Boolean(flyoutReference.current?.contains(target)) ||
        Boolean(navContainerReference.current?.contains(target))
      ) {
        return;
      }
    }

    if (openIntentTimeoutReference.current) {
      clearTimeout(openIntentTimeoutReference.current);
      openIntentTimeoutReference.current = undefined;
    }

    if (closeTimeoutReference.current) {
      clearTimeout(closeTimeoutReference.current);
    }

    closeTimeoutReference.current = setTimeout(() => {
      setOpenDropdownId(undefined);
    }, 200);
  };

  const cancelPendingIntent = (): void => {
    if (openIntentTimeoutReference.current) {
      clearTimeout(openIntentTimeoutReference.current);
      openIntentTimeoutReference.current = undefined;
    }
    if (closeTimeoutReference.current) {
      clearTimeout(closeTimeoutReference.current);
      closeTimeoutReference.current = undefined;
    }
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

  const toggleSearchExpand = (): void => {
    if (isSearchExpanded) {
      setIsSearchExpanded(false);
    } else {
      setIsSearchExpanded(true);
      setTimeout(() => {
        searchInputReference.current?.focus();
      }, 50);
    }
  };

  return (
    <div
      ref={navContainerReference}
      className="hidden items-center gap-4 xl:flex"
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Navigation Bar */}
      <nav className="flex items-center gap-1 transition-all duration-300 xl:gap-1.5">
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
                onMouseEnter={() => {
                  if (closeTimeoutReference.current) clearTimeout(closeTimeoutReference.current);
                  closeTimeoutReference.current = setTimeout(() => {
                    setOpenDropdownId(undefined);
                  }, 150);
                }}
                className="hover:bg-conveniat-green/10 hover:text-conveniat-green rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-gray-700 transition-all duration-200"
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
                    'flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200',
                    isOpen
                      ? 'bg-conveniat-green/10 text-conveniat-green'
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
              className="rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-gray-400"
            >
              {item.label}
            </span>
          );
        })}
      </nav>

      {/* Modern Sleek Full-Width Submenu Flyout Panel (2px border-b matching header, with top hit-bridge) */}
      {hasActiveSubMenu && (
        <div
          ref={flyoutReference}
          className="animate-in fade-in-0 slide-in-from-top-1 fixed top-16 right-0 left-0 z-50 w-full border-b-2 border-gray-200 bg-white/98 backdrop-blur-2xl transition-all duration-200 before:absolute before:-top-4 before:right-0 before:left-0 before:h-4 before:content-['']"
          onMouseEnter={cancelPendingIntent}
          onMouseLeave={handleMouseLeave}
        >
          <div className="w-full px-6 py-8 xl:px-12">
            <div className="flex flex-wrap gap-8 xl:gap-12">
              {activeSubMenu.map((subItem) => {
                if (!subItem.isVisible) return;

                const hasSubSub = Array.isArray(subItem.subMenu) && subItem.subMenu.length > 0;

                return (
                  <div key={subItem.id} className="max-w-[280px] min-w-[220px] flex-1">
                    {hasSubSub ? (
                      <>
                        {/* Section Header with children: clean label with underline, NO chevron arrow */}
                        {typeof subItem.itemLink === 'string' && subItem.itemLink !== '' ? (
                          <LinkComponent
                            href={subItem.itemLink}
                            openInNewTab={subItem.openInNewTab}
                            prefetch
                            className="group/head text-conveniat-green hover:text-conveniat-green/80 border-conveniat-green/20 mb-3 flex h-8 items-center border-b pb-1 font-['Montserrat'] text-xs font-extrabold tracking-wider uppercase transition-colors"
                          >
                            <span className="truncate">{subItem.label}</span>
                          </LinkComponent>
                        ) : (
                          <div className="text-conveniat-green border-conveniat-green/20 mb-3 flex h-8 items-center border-b pb-1 font-['Montserrat'] text-xs font-extrabold tracking-wider uppercase">
                            <span className="truncate">{subItem.label}</span>
                          </div>
                        )}

                        {/* Level 3 Links List */}
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
                                  className="group/item hover:bg-conveniat-green/10 hover:text-conveniat-green flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-150"
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="bg-conveniat-green/40 group-hover/item:bg-conveniat-green size-1.5 rounded-full transition-colors" />
                                    <span>{subSubItem.label}</span>
                                  </span>
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
                      </>
                    ) : (
                      <SubItemWithoutChildren subItem={subItem} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Utilities: Language Switcher & Responsive Search Input */}
      <div className="relative flex h-8 items-center gap-2 border-l border-gray-200/80 pl-3">
        {/* Language Switcher */}
        <div
          className="relative"
          onMouseEnter={() => setIsLangOpen(true)}
          onMouseLeave={() => setIsLangOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="hover:border-conveniat-green/40 hover:text-conveniat-green flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 px-2.5 text-xs font-semibold text-gray-700 transition-all duration-200 hover:bg-white"
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
              <div className="animate-in fade-in-0 slide-in-from-top-1 rounded-xl border border-gray-200/80 bg-white/95 p-1.5 backdrop-blur-xl duration-150">
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

        {/* Responsive Search Input: Absolute Overlay on Narrow Screens, In-Line Expansion on Wide Screens */}
        <div className="relative flex h-8 items-center justify-end">
          <button
            type="button"
            onClick={toggleSearchExpand}
            className={cn(
              'hover:border-conveniat-green/40 hover:text-conveniat-green flex size-8 items-center justify-center rounded-xl border border-gray-200 bg-gray-50/80 text-gray-600 transition-all duration-200 hover:bg-white',
              isSearchExpanded && '2xl:hidden',
            )}
            aria-label="Suchen"
            title="Suchen"
          >
            <Search className="size-3.5 text-gray-500" />
          </button>

          {isSearchExpanded && (
            <form
              onSubmit={handleSearchSubmit}
              className="animate-in fade-in-0 slide-in-from-right-2 absolute top-0 right-0 z-50 flex h-8 items-center 2xl:relative 2xl:top-auto 2xl:right-auto 2xl:z-auto"
            >
              <div className="relative flex h-8 items-center">
                <input
                  ref={searchInputReference}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onBlur={() => {
                    if (searchQuery.trim() === '') {
                      setIsSearchExpanded(false);
                    }
                  }}
                  placeholder="Suchen..."
                  className="h-8 w-56 rounded-xl border border-gray-200 bg-white pr-7 pl-8 text-xs text-gray-800 transition-all duration-200 focus:border-gray-300 focus:ring-0 focus:outline-hidden 2xl:w-64"
                />
                <Search className="pointer-events-none absolute left-2.5 size-3.5 text-gray-500" />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchExpanded(false);
                  }}
                  className="hover:text-conveniat-green absolute right-2 flex size-4 items-center justify-center text-gray-400"
                >
                  <X className="size-3" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
