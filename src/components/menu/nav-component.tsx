'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { Menu as MenuIcon, X } from 'lucide-react';

import type React from 'react';
import { useCallback, useState } from 'react';

export const NavComponent: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const checkClickEvent = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      // check if the event target has the class 'closeNavOnClick'
      if ((event.target as HTMLElement).classList.contains('closeNavOnClick')) {
        setMobileMenuOpen(false);
      }
    },
    [setMobileMenuOpen],
  );

  // close menu if page gets resized to desktop view (tailwind xl breakpoint)
  const handleResize = useCallback(() => {
    if (window.innerWidth >= 1280) {
      setMobileMenuOpen(false);
    }
  }, []);

  // add event listener for resize
  window.addEventListener('resize', handleResize);

  return (
    <>
      <div className="xl:hidden">
        {!mobileMenuOpen && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="cursor-pointer relative top-[18px] outline-hidden"
          >
            <span className="sr-only">Open main menu</span>
            <MenuIcon aria-hidden="true" className="size-6" />
          </button>
        )}

        {mobileMenuOpen && (
          <button type="button" className=" relative top-[18px] outline-hidden">
            <span className="sr-only">Close menu</span>
            <X aria-hidden="true" className="size-6" />
          </button>
        )}

        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen}>
          <div className="cursor-pointer fixed inset-0 z-10" />
          <DialogPanel className="fixed inset-y-0 right-0 z-[40] w-full bg-white px-6 mt-[62px] py-6 overflow-y-scroll">
            <div onClick={checkClickEvent}>{children}</div>
          </DialogPanel>
        </Dialog>
      </div>

      <div className="hidden xl:block left-0 top-[62px] height-[calc(100&-62px)] p-8 fixed h-full bg-white border-r-2 w-96 border-gray-200  ">
        {children}
      </div>
    </>
  );
};
