'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { Menu as MenuIcon, X } from 'lucide-react';

import { useMobileMenuNavigation } from '@/hooks/use-mobile-menu-navigation';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

const openMenuText: StaticTranslationString = {
  de: 'Hauptmenü öffnen',
  en: 'Open main menu',
  fr: 'Ouvrir le menu principal',
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

  const handleClose = useCallback(() => {
    setMobileMenuOpen(false);
    justClosedReference.current = true;
    setTimeout(() => {
      justClosedReference.current = false;
    }, 200);
  }, [setMobileMenuOpen]);

  const handleOpen = useCallback(() => {
    if (justClosedReference.current) return;
    setMobileMenuOpen(true);
  }, [setMobileMenuOpen]);

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
            className="relative top-[18px] z-[105] cursor-pointer outline-hidden"
          >
            <span className="sr-only">{openMenuText[locale]}</span>
            <MenuIcon aria-hidden="true" className="size-6" />
          </button>
        )}

        <Dialog open={mobileMenuOpen} onClose={handleClose}>
          <div className="fixed inset-0 z-[90] cursor-pointer bg-black/20" />
          {/* The close button sits where the menu button was, in the header's own box, but inside
              the dialog: everything outside an open dialog is inert, so a button left in the
              header could not be reached by keyboard or screen reader. */}
          <div className="fixed inset-x-0 top-0 z-[106] h-[60px]">
            <div className="mx-auto h-full w-full max-w-2xl px-6 xl:ml-4">
              <button
                type="button"
                className="relative top-[18px] cursor-pointer outline-hidden"
                onClick={handleClose}
              >
                <span className="sr-only">{closeMenuText[locale]}</span>
                <X aria-hidden="true" className="size-6" />
              </button>
            </div>
          </div>
          <DialogPanel className="fixed inset-y-0 right-0 left-0 z-[95] mt-[62px] w-full overflow-y-scroll bg-white px-4 pt-4 pb-6 shadow-2xl">
            <div onClick={(event): void => checkClickEvent(event)}>{children}</div>
          </DialogPanel>
        </Dialog>
      </div>

      {/* Desktop Side Panel (rendered for side-nav layout mode) */}
      {showDesktopSidePanel && (
        <div className="fixed top-[62px] left-0 hidden h-full w-96 border-r-2 border-gray-200 bg-white py-8 xl:block">
          {children}
        </div>
      )}
    </>
  );
};
