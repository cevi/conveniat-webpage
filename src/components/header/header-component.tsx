import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { NavComponent } from '@/components/menu/nav-component';

export const HeaderComponent: React.FC = () => {
  return (
    <header className="fixed left-0 top-0 z-50 h-[112px] w-screen">
      <div className="mb-[32px] border-b border-b-gray-200 bg-green-100">
        <div className="relative mx-auto h-[60px] w-full max-w-5xl text-conveniat-green">
          <div className="flex items-center justify-between px-6">
            <Link href="/">
              <Image
                src="/favicon.svg"
                alt="Conveniat 2027 Logo"
                width={80}
                height={80}
                className="absolute left-[24px] top-[12px] z-[999]"
              />
            </Link>
            <span className="absolute left-0 top-[22px] flex w-full items-center justify-center text-[24px] font-extrabold leading-normal">
              Conveniat
            </span>
            <NavComponent />
          </div>
        </div>
      </div>
    </header>
  );
};
