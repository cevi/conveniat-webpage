'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { Menu as MenuIcon, X } from 'lucide-react';

import { useMobileMenuNavigation } from '@/hooks/use-mobile-menu-navigation';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

const openMenuText: StaticTranslationString = {
  de: 'Hauptmenü öffnen',
  en: 'Open main menu',
  fr: 'Ouvrir le menu principal',
};

// 44px round, the icon in the middle; the negative margin keeps the header layout of a bare icon
const menuButtonClassName =
  'focus-visible:ring-conveniat-green -m-2.5 flex cursor-pointer items-center justify-center rounded-full p-2.5 outline-hidden focus-visible:ring-2';

const menuDialogName: StaticTranslationString = {
  de: 'Hauptmenü',
  en: 'Main menu',
  fr: 'Menu principal',
};

const closeMenuText: StaticTranslationString = {
  de: 'Menü schliessen',
  en: 'Close menu',
  fr: 'Fermer le menu',
};

export const NavComponent: React.FC<{
  children?: React.ReactNode;
  showDesktopSidePanel?: boolean;
  // A prop, not `useCurrentLocale`: the header is part of the prerendered shell, which must not
  // read the pathname.
  locale: Locale;
}> = ({ children, showDesktopSidePanel = true, locale }) => {
  const { mobileMenuOpen, setMobileMenuOpen, checkClickEvent } = useMobileMenuNavigation();
  const justClosedReference = useRef(false);
  // Where the menu button sits, so the close button takes its place. The button is on the left in
  // the app and on the right on the website, depending on the header around it.
  const [menuButtonPosition, setMenuButtonPosition] = useState({ top: 8, left: 14 });

  const handleClose = useCallback(() => {
    setMobileMenuOpen(false);
    justClosedReference.current = true;
    setTimeout(() => {
      justClosedReference.current = false;
    }, 200);
  }, [setMobileMenuOpen]);

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (justClosedReference.current) return;
      const { top, left } = event.currentTarget.getBoundingClientRect();
      setMenuButtonPosition({ top, left });
      setMobileMenuOpen(true);
    },
    [setMobileMenuOpen],
  );

  // close menu if page gets resized to desktop view (tailwind xl breakpoint)
  const handleResize = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (window?.innerWidth >= 1280) {
      handleClose();
    }
  }, [handleClose]);

  // add event listener for resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return (): void => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return (
    <>
      <div className="h-[60px] xl:hidden">
        {!mobileMenuOpen && (
          <button
            type="button"
            onClick={handleOpen}
            className={cn(menuButtonClassName, 'relative top-[18px] z-[105]')}
          >
            <span className="sr-only">{openMenuText[locale]}</span>
            <MenuIcon aria-hidden="true" className="size-6" />
          </button>
        )}

        <Dialog open={mobileMenuOpen} onClose={handleClose} aria-label={menuDialogName[locale]}>
          <div className="fixed inset-0 z-[90] cursor-pointer bg-black/20" />
          {/* The close button sits where the menu button was, but inside the dialog: everything
              outside an open dialog is inert, so a button left in the header could not be reached
              by keyboard or screen reader. */}
          <button
            type="button"
            className={cn(menuButtonClassName, 'fixed z-[106] m-0')}
            style={menuButtonPosition}
            onClick={handleClose}
          >
            <span className="sr-only">{closeMenuText[locale]}</span>
            <X aria-hidden="true" className="size-6" />
          </button>
          <DialogPanel className="fixed inset-y-0 right-0 left-0 z-[95] mt-[62px] w-full overflow-y-scroll bg-white px-4 pt-4 pb-6 shadow-2xl">
            <div onClick={(event): void => checkClickEvent(event)}>{children}</div>
          </DialogPanel>
        </Dialog>
      </div>

      {/* Desktop Side Panel (rendered for side-nav layout mode) */}
      {showDesktopSidePanel && (
        <nav
          aria-label={menuDialogName[locale]}
          className="fixed top-[62px] left-0 hidden h-full w-96 border-r-2 border-gray-200 bg-white py-8 xl:block"
        >
          {children}
        </nav>
      )}
    </>
  );
};
