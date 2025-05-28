'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import { Menu as MenuIcon, X } from 'lucide-react';

import type React from 'react';
import { useState } from 'react';

export const NavComponent: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
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
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="relative top-[18px] outline-hidden"
        >
          <span className="sr-only">Close menu</span>
          <X aria-hidden="true" className="size-6" />
        </button>
      )}

      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className="fixed inset-0 z-10" />
        <DialogPanel className="fixed inset-y-0 right-0 z-[40] w-full overflow-y-auto bg-white px-6 mt-[62px] py-6">
          {children}
        </DialogPanel>
      </Dialog>
    </>
  );
};
