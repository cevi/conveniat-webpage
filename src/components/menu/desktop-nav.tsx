'use client';

import { CurrentMenuPathContext } from '@/components/menu/app-feature-link';
import { appFeaturesTitle } from '@/components/menu/app-features-title';
import type { ProcessedMainMenuItem } from '@/components/menu/main-menu';
import { moreColumnLabel, splitMenuColumns } from '@/components/menu/menu-columns';
import type { MenuNode } from '@/components/menu/menu-links';
import { MenuEntryLabel, MenuLinks, visibleChildren } from '@/components/menu/menu-links';
import { useFittingItemCount } from '@/components/menu/use-fitting-item-count';
import { languageOptions } from '@/config/language-options';
import { usePreviewMode } from '@/hooks/use-preview-mode';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, Languages, Menu as MenuIcon, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { useEffect, useId, useRef, useState } from 'react';

const menuButtonLabel: StaticTranslationString = {
  de: 'Menü',
  fr: 'Menu',
  en: 'Menu',
};

const searchLabel: StaticTranslationString = {
  de: 'Suchen',
  fr: 'Rechercher',
  en: 'Search',
};

const searchPlaceholder: StaticTranslationString = {
  de: 'Suchen...',
  fr: 'Rechercher...',
  en: 'Search...',
};

const pinnedItemClassName =
  'flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap';
const pinnedRowClassName = 'flex items-center gap-1 xl:gap-1.5';

const columnHeadingClassName =
  'font-heading border-line mb-1.5 block border-b px-3 pb-3.5 text-[13px] font-extrabold tracking-[0.09em] text-green-600 uppercase';

/**
 * Calls `onDismiss` on a pointer press outside every referenced element, or on Escape, while `isOpen`.
 */
const useDismissOnOutsideInteraction = (
  references: React.RefObject<HTMLElement | null>[],
  isOpen: boolean,
  onDismiss: () => void,
): void => {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (references.some((reference) => reference.current?.contains(target) === true)) return;
      onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [references, isOpen, onDismiss]);
};

/**
 * Moves the focus into the column `sectionId` names once the menu opened on it, so a keyboard
 * continues where the pinned entry sent it, and scrolls the column into view on short screens.
 */
const useFocusMenuSection = (
  panel: React.RefObject<HTMLElement | null>,
  sectionId: string | undefined,
): void => {
  useEffect(() => {
    if (sectionId === undefined) return;
    const section = panel.current?.querySelector<HTMLElement>(`[data-menu-section="${sectionId}"]`);
    section?.scrollIntoView({ block: 'nearest' });
    section?.querySelector<HTMLElement>('a, [tabindex]')?.focus({ preventScroll: true });
  }, [panel, sectionId]);
};

/**
 * The opened menu: every column side by side, in the order the editors gave them, and the entries
 * without entries below them collected in a last column. Opened from a pinned entry, that entry's
 * column is marked. In the app, the app's features come first.
 */
const MenuPanel: React.FC<{
  id: string;
  locale: Locale;
  menuItems: ProcessedMainMenuItem[];
  appFeatures: ReactNode;
  highlightedId: string | undefined;
  isCurrent: (node: MenuNode) => boolean;
  panelReference: React.RefObject<HTMLDivElement | null>;
  onLinkClick: (event: React.MouseEvent) => void;
}> = ({
  id,
  locale,
  menuItems,
  appFeatures,
  highlightedId,
  isCurrent,
  panelReference,
  onLinkClick,
}) => {
  useFocusMenuSection(panelReference, highlightedId);

  // a column whose entries are all hidden from this reader is a plain link
  const items = menuItems
    .filter((item) => item.isVisible)
    .map((item) => ({ ...item, subMenu: visibleChildren(item, false) }));
  const { columns, more } = splitMenuColumns(items);

  return (
    <div
      id={id}
      ref={panelReference}
      onClick={onLinkClick}
      className="animate-in fade-in-0 slide-in-from-top-1 border-line fixed top-[calc(4rem+var(--preview-banner-height))] right-0 left-0 z-50 max-h-[calc(100dvh-4rem-var(--preview-banner-height))] overflow-y-auto border-b-2 bg-white duration-150"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-8 px-12 py-10">
        {appFeatures !== undefined && (
          <section aria-label={appFeaturesTitle[locale]} className="-m-3 p-3">
            <span className={columnHeadingClassName}>{appFeaturesTitle[locale]}</span>
            {appFeatures}
          </section>
        )}

        {columns.map((item) => (
          <section
            key={item.id}
            data-menu-section={item.id}
            aria-label={item.label}
            className={cn(
              '-m-3 rounded-[14px] p-3 transition-colors',
              highlightedId === item.id && 'bg-tint',
            )}
          >
            <MenuEntryLabel
              node={item}
              isCurrent={isCurrent(item)}
              className={cn(columnHeadingClassName, item.hasLink && 'hover:text-heading')}
            />
            <MenuLinks nodes={item.subMenu} showPreview={false} isCurrent={isCurrent} />
          </section>
        ))}

        {more.length > 0 && (
          <section aria-label={moreColumnLabel[locale]} className="-m-3 p-3">
            <span className={columnHeadingClassName}>{moreColumnLabel[locale]}</span>
            <MenuLinks nodes={more} showPreview={false} isCurrent={isCurrent} />
          </section>
        )}
      </div>
    </div>
  );
};

const PinnedItem: React.FC<{
  item: ProcessedMainMenuItem;
  isOpen: boolean;
  isCurrent: boolean;
  menuId: string;
  onOpen: () => void;
}> = ({ item, isOpen, isCurrent, menuId, onOpen }) => {
  // an entry with entries below it has no room for them in the bar, so it opens the menu at its
  // column; its own link, if any, is the heading of that column
  if (visibleChildren(item, false).length > 0) {
    return (
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={onOpen}
        className={cn(
          pinnedItemClassName,
          'transition-colors duration-150',
          isOpen ? 'bg-tint text-heading' : 'hover:bg-tint hover:text-heading text-gray-700',
        )}
      >
        <span>{item.label}</span>
        <ChevronDown
          aria-hidden
          className={cn('size-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
    );
  }

  return (
    <MenuEntryLabel
      node={item}
      isCurrent={isCurrent}
      className={cn(
        pinnedItemClassName,
        'hover:bg-tint hover:text-heading text-gray-700 transition-colors duration-150',
        isCurrent && 'text-heading underline decoration-2 underline-offset-8',
      )}
    />
  );
};

/**
 * The header bar of the website on large screens: the entries the editors pinned, the language,
 * the search, and "Menü", which opens the whole menu below the bar.
 */
export const DesktopNav: React.FC<{
  locale: Locale;
  menuItems: ProcessedMainMenuItem[];
  /** the draft menu, handed over for an editor only and shown in preview mode */
  draftMenuItems?: ProcessedMainMenuItem[] | undefined;
  actionURL: string;
  /** the app's features, the first column of the menu in the app */
  appFeatures?: ReactNode;
}> = ({ locale, menuItems: publishedMenuItems, draftMenuItems, actionURL, appFeatures }) => {
  const searchParameters = useSearchParams();
  const { isInPreviewMode } = usePreviewMode();
  const menuItems =
    isInPreviewMode === 'enabled' && draftMenuItems !== undefined
      ? draftMenuItems
      : publishedMenuItems;

  // undefined while closed; `true` when opened from "Menü", the id of a pinned entry when opened
  // from it. `?menu=open` opens it on load, which is how the header global's live preview shows it.
  const [openedFrom, setOpenedFrom] = useState<string | true | undefined>(() =>
    searchParameters.get('menu') === 'open' ? true : undefined,
  );
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const menuId = useId();
  const barReference = useRef<HTMLDivElement>(null);
  const pinnedReference = useRef<HTMLElement>(null);
  const measureRowReference = useRef<HTMLDivElement>(null);
  const panelReference = useRef<HTMLDivElement>(null);
  const dismissReferences = [barReference];
  const searchInputReference = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Editors choose how many entries to pin and how long their labels are, so no breakpoint
  // guarantees they fit. Whatever does not fit is left out of the bar; it is still in the menu.
  const pinnedItems = menuItems.filter((item) => item.isVisible && item.isPinned);
  const fittingCount = useFittingItemCount(
    pinnedReference,
    measureRowReference,
    pinnedItems.length,
  );
  const fittingItems = pinnedItems.slice(0, fittingCount);
  const hasMenu = appFeatures !== undefined || menuItems.some((item) => item.isVisible);

  const isMenuOpen = openedFrom !== undefined;
  const highlightedId = typeof openedFrom === 'string' ? openedFrom : undefined;
  const isCurrent = (node: MenuNode): boolean => node.hasLink && node.itemLink === pathname;

  const closeMenu = (): void => setOpenedFrom(undefined);

  useDismissOnOutsideInteraction(dismissReferences, isMenuOpen, closeMenu);

  const closeOnLinkClick = (event: React.MouseEvent): void => {
    if (event.target instanceof Element && event.target.closest('a') !== null) closeMenu();
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

    globalThis.location.assign(newPath);
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
    <div ref={barReference} className="hidden min-w-0 flex-1 items-center gap-4 xl:flex">
      {/* The pinned entries that fit, measured by useFittingItemCount */}
      <nav
        ref={pinnedReference}
        onClick={closeOnLinkClick}
        className={cn(
          'relative min-w-0 flex-1 justify-end-safe overflow-hidden',
          pinnedRowClassName,
        )}
      >
        {fittingItems.map((item) => (
          <PinnedItem
            key={item.id}
            item={item}
            isOpen={highlightedId === item.id}
            isCurrent={isCurrent(item)}
            menuId={menuId}
            onOpen={() => setOpenedFrom(highlightedId === item.id ? undefined : item.id)}
          />
        ))}

        {/* Invisible copy of every pinned entry, measured by useFittingItemCount. The empty last
            child stands in for its overflow button: there is none, the menu holds everything. */}
        <div
          ref={measureRowReference}
          aria-hidden
          className={cn('pointer-events-none invisible absolute top-0 left-0', pinnedRowClassName)}
        >
          {pinnedItems.map((item) => (
            <span key={item.id} className={pinnedItemClassName}>
              <span>{item.label}</span>
              {visibleChildren(item, false).length > 0 && <ChevronDown className="size-4" />}
            </span>
          ))}
          <span />
        </div>
      </nav>

      {/* Utilities: Language Switcher & Responsive Search Input */}
      <div className="relative flex h-8 shrink-0 items-center gap-2 border-l border-gray-200/80 pl-3">
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
                {languageOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleLanguageChange(value)}
                    className={cn(
                      'block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors',
                      locale === value
                        ? 'bg-conveniat-green/10 text-conveniat-green font-bold'
                        : 'hover:text-conveniat-green text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {label}
                  </button>
                ))}
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
            aria-label={searchLabel[locale]}
            title={searchLabel[locale]}
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
                  placeholder={searchPlaceholder[locale]}
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

      {hasMenu && (
        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          onClick={() => setOpenedFrom(isMenuOpen ? undefined : true)}
          className="bg-conveniat-green flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {isMenuOpen ? (
            <X aria-hidden className="size-4" />
          ) : (
            <MenuIcon aria-hidden className="size-4" />
          )}
          {menuButtonLabel[locale]}
        </button>
      )}

      {isMenuOpen && (
        <>
          {/* dims the page below the menu; a press on it closes the menu */}
          <div
            aria-hidden
            onClick={closeMenu}
            className="animate-in fade-in-0 fixed inset-x-0 top-[calc(4rem+var(--preview-banner-height))] z-40 h-dvh bg-gray-950/30"
          />
          {/* the app's links mark the open page with it */}
          <CurrentMenuPathContext value={pathname}>
            <MenuPanel
              id={menuId}
              locale={locale}
              menuItems={menuItems}
              appFeatures={appFeatures}
              highlightedId={highlightedId}
              isCurrent={isCurrent}
              panelReference={panelReference}
              onLinkClick={closeOnLinkClick}
            />
          </CurrentMenuPathContext>
        </>
      )}
    </div>
  );
};
