'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { Menu as MenuIcon, X } from 'lucide-react';

import { useMobileMenuNavigation } from '@/hooks/use-mobile-menu-navigation';
import type React from 'react';
import { useCallback, useEffect } from 'react';

export const NavComponent: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const { mobileMenuOpen, setMobileMenuOpen, checkClickEvent } = useMobileMenuNavigation();

  // close menu if page gets resized to desktop view (tailwind xl breakpoint)
  const handleResize = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (window?.innerWidth >= 1280) {
      setMobileMenuOpen(false);
    }
  }, [setMobileMenuOpen]);

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
            onClick={(): void => setMobileMenuOpen(true)}
            className="relative top-[18px] cursor-pointer outline-hidden"
          >
            <span className="sr-only">Open main menu</span>
            <MenuIcon aria-hidden="true" className="size-6" />
          </button>
        )}

        {mobileMenuOpen && (
          <button
            type="button"
            className="relative top-[18px] outline-hidden"
            onClick={(): void => setMobileMenuOpen(false)}
          >
            <span className="sr-only">Close menu</span>
            <X aria-hidden="true" className="size-6" />
          </button>
        )}

        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen}>
          <div className="fixed inset-0 z-10 cursor-pointer" />
          <DialogPanel className="fixed inset-y-0 right-0 z-40 mt-[62px] w-full overflow-y-scroll bg-white px-2 pt-4 pb-6 xl:px-6">
            <div onClick={(event): void => checkClickEvent(event)}>{children}</div>
          </DialogPanel>
        </Dialog>
      </div>

      <div className="fixed top-[62px] left-0 hidden h-full w-96 border-r-2 border-gray-200 bg-white py-8 xl:block">
        {children}
      </div>
    </>
  );
};
